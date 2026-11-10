import { JobLocation, JobSeniority, JobStatus, JobVerdict, JudgeStatus, type Job } from '../types.js';
import type { Db } from './database.js';

export type NewJob = Omit<Job, 'id' | 'status' | 'foundAt'> & { foundAt?: string };

export interface JobQuery {
  status: JobStatus | null;
  verdict: JobVerdict;
  seniority: JobSeniority | null;
  source: string | null;
  search: string | null;
  hasApply: boolean | null;
  limit: number;
  offset: number;
}

interface JobStats {
  new: number;
  saved: number;
  total: number;
  /** Cuántas hay en cada estado. El menú lateral las enseña como contador. */
  byStatus: Record<JobStatus, number>;
}

interface JobRow {
  id: number;
  source: string;
  fingerprint: string;
  title: string | null;
  role: string | null;
  company: string | null;
  author: string | null;
  text: string;
  url: string | null;
  location: string | null;
  location_kind: JobLocation;
  verdict: JobVerdict;
  rejection_reason: string | null;
  seniority: JobSeniority;
  is_aggregator: number;
  is_uncertain: number;
  stack_match: string;
  apply_url: string | null;
  contact_email: string | null;
  judge_status: JudgeStatus;
  status: JobStatus;
  found_at: string;
  posted_at: string | null;
}

const JOB_COLUMNS = `id, source, fingerprint, title, role, company, author, text, url, location, location_kind,
  verdict, rejection_reason, seniority, is_aggregator, is_uncertain, stack_match, apply_url, contact_email,
  judge_status, status, found_at, posted_at`;

function toJob(row: JobRow): Job {
  return {
    id: row.id,
    source: row.source,
    fingerprint: row.fingerprint,
    title: row.title,
    role: row.role,
    company: row.company,
    author: row.author,
    text: row.text,
    url: row.url,
    location: row.location,
    verdict: row.verdict,
    rejectionReason: row.rejection_reason,
    seniority: row.seniority,
    isAggregator: row.is_aggregator === 1,
    judgeStatus: row.judge_status,
    status: row.status,
    foundAt: row.found_at,
    postedAt: row.posted_at,
    stackMatch: JSON.parse(row.stack_match) as string[],
    locationKind: row.location_kind,
    applyUrl: row.apply_url,
    contactEmail: row.contact_email,
    isUncertain: row.is_uncertain === 1,
  };
}

export class JobsRepository {
  constructor(private readonly db: Db) {}

  /** `true` si la oferta es nueva; `false` si esa huella ya estaba en la BD. */
  insert(job: NewJob): boolean {
    const result = this.db.prepare(`
      INSERT OR IGNORE INTO jobs (source, fingerprint, title, role, company, author, text, url, location, location_kind,
        verdict, rejection_reason, seniority, is_aggregator, is_uncertain, stack_match, apply_url, contact_email,
        judge_status, status, found_at, posted_at)
      VALUES (@source, @fingerprint, @title, @role, @company, @author, @text, @url, @location, @locationKind,
        @verdict, @rejectionReason, @seniority, @isAggregator, @isUncertain, @stackMatch, @applyUrl, @contactEmail,
        @judgeStatus, @status, @foundAt, @postedAt)
    `).run({
      ...job,
      isAggregator: job.isAggregator ? 1 : 0,
      isUncertain: job.isUncertain ? 1 : 0,
      stackMatch: JSON.stringify(job.stackMatch),
      status: JobStatus.New,
      foundAt: job.foundAt ?? new Date().toISOString(),
    });
    return result.changes > 0;
  }

  fingerprintsOf(source: string): Set<string> {
    const rows = this.db.prepare<[string], { fingerprint: string }>('SELECT fingerprint FROM jobs WHERE source = ?').all(source);
    return new Set(rows.map((r) => r.fingerprint));
  }

  findById(id: number): Job | null {
    const row = this.db.prepare<[number], JobRow>(`SELECT ${JOB_COLUMNS} FROM jobs WHERE id = ?`).get(id);
    return row ? toJob(row) : null;
  }

  updateStatus(id: number, status: JobStatus): Job | null {
    const result = this.db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, id);
    return result.changes > 0 ? this.findById(id) : null;
  }

  /**
   * La lista, y además CUÁNTAS HAY EN CADA PESTAÑA con los mismos filtros.
   *
   * El recuento por seniority se calcula ignorando la pestaña elegida, y eso
   * es el arreglo de un bug que se veía feo: el menú decía "1 nueva" y la
   * lista salía vacía con un "No hay ofertas nuevas". Las dos cosas eran
   * ciertas por separado —la única oferta era junior y estaba en la otra
   * pestaña— pero juntas parecían un error. Un contador que no cuadra con lo
   * que se ve debajo destruye la confianza en todo lo demás.
   */
  list(query: JobQuery): { items: Job[]; total: number; bySeniority: Record<JobSeniority, number> } {
    const { where, params } = this.buildWhere(query);
    const total = this.db.prepare<unknown[], { count: number }>(`SELECT COUNT(*) AS count FROM jobs ${where}`).get(...params)?.count ?? 0;
    const rows = this.db.prepare<unknown[], JobRow>(
      `SELECT ${JOB_COLUMNS} FROM jobs ${where} ORDER BY found_at DESC, id DESC LIMIT ? OFFSET ?`,
    ).all(...params, query.limit, query.offset);
    return { items: rows.map(toJob), total, bySeniority: this.countBySeniority(query) };
  }

  private countBySeniority(query: JobQuery): Record<JobSeniority, number> {
    const { where, params } = this.buildWhere({ ...query, seniority: null });
    const rows = this.db.prepare<unknown[], { seniority: JobSeniority; count: number }>(
      `SELECT seniority, COUNT(*) AS count FROM jobs ${where} GROUP BY seniority`,
    ).all(...params);
    const counts = Object.fromEntries(Object.values(JobSeniority).map((s) => [s, 0])) as Record<JobSeniority, number>;
    for (const row of rows) counts[row.seniority] = row.count;
    return counts;
  }

  /**
   * El resumen de la bandeja. Se cuenta por estado en una sola consulta y se
   * rellenan los estados sin ninguna oferta: un contador que desaparece cuando
   * vale cero hace dudar de si la lista está vacía o rota.
   */
  stats(): JobStats {
    const rows = this.db.prepare<[], { status: JobStatus; count: number }>(
      "SELECT status, COUNT(*) AS count FROM jobs WHERE verdict = 'accepted' GROUP BY status",
    ).all();
    const byStatus = Object.fromEntries(Object.values(JobStatus).map((s) => [s, 0])) as Record<JobStatus, number>;
    let total = 0;
    for (const row of rows) {
      byStatus[row.status] = row.count;
      total += row.count;
    }
    return { new: byStatus[JobStatus.New], saved: byStatus[JobStatus.Saved], total, byStatus };
  }

  private buildWhere(query: JobQuery): { where: string; params: Array<string | number> } {
    const clauses = ['verdict = ?'];
    const params: Array<string | number> = [query.verdict];
    if (query.status) { clauses.push('status = ?'); params.push(query.status); }
    if (query.seniority) { clauses.push('seniority = ?'); params.push(query.seniority); }
    if (query.source) { clauses.push('source = ?'); params.push(query.source); }
    if (query.search) {
      clauses.push('(text LIKE ? OR author LIKE ?)');
      params.push(`%${query.search}%`, `%${query.search}%`);
    }
    if (query.hasApply !== null) {
      clauses.push(query.hasApply ? '(apply_url IS NOT NULL OR contact_email IS NOT NULL)' : '(apply_url IS NULL AND contact_email IS NULL)');
    }
    return { where: `WHERE ${clauses.join(' AND ')}`, params };
  }
}
