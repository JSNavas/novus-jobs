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

export interface JobStats {
  new: number;
  saved: number;
  total: number;
}

interface JobRow {
  id: number;
  source: string;
  fingerprint: string;
  title: string | null;
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

const JOB_COLUMNS = `id, source, fingerprint, title, company, author, text, url, location, location_kind,
  verdict, rejection_reason, seniority, is_aggregator, is_uncertain, stack_match, apply_url, contact_email,
  judge_status, status, found_at, posted_at`;

function toJob(row: JobRow): Job {
  return {
    id: row.id,
    source: row.source,
    fingerprint: row.fingerprint,
    title: row.title,
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
      INSERT OR IGNORE INTO jobs (source, fingerprint, title, company, author, text, url, location, location_kind,
        verdict, rejection_reason, seniority, is_aggregator, is_uncertain, stack_match, apply_url, contact_email,
        judge_status, status, found_at, posted_at)
      VALUES (@source, @fingerprint, @title, @company, @author, @text, @url, @location, @locationKind,
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

  list(query: JobQuery): { items: Job[]; total: number } {
    const { where, params } = this.buildWhere(query);
    const total = this.db.prepare<unknown[], { count: number }>(`SELECT COUNT(*) AS count FROM jobs ${where}`).get(...params)?.count ?? 0;
    const rows = this.db.prepare<unknown[], JobRow>(
      `SELECT ${JOB_COLUMNS} FROM jobs ${where} ORDER BY found_at DESC, id DESC LIMIT ? OFFSET ?`,
    ).all(...params, query.limit, query.offset);
    return { items: rows.map(toJob), total };
  }

  stats(): JobStats {
    const row = this.db.prepare<[], { fresh: number; saved: number; total: number }>(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END), 0) AS fresh,
        COALESCE(SUM(CASE WHEN status = 'saved' THEN 1 ELSE 0 END), 0) AS saved,
        COUNT(*) AS total
      FROM jobs WHERE verdict = 'accepted'
    `).get();
    if (!row) return { new: 0, saved: 0, total: 0 };
    return { new: row.fresh, saved: row.saved, total: row.total };
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
