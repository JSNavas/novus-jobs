import type { PostMetrics } from '../sources/types.js';
import { JobLocation, JobStatus, JobVerdict, JudgeStatus, type Job } from '../types.js';
import type { Db } from './database.js';

export type NewJob = Omit<
  Job,
  'id' | 'status' | 'foundAt' | 'runId' | 'applications' | 'responseDays' | 'rejectionCode' | 'rejectionParams'
>
  & {
    foundAt?: string;
    runId?: number | null;
    rejectionCode?: string | null;
    rejectionParams?: Record<string, string | number> | null;
    applications?: number | null;
    responseDays?: { min: number | null; max: number | null } | null;
  };

export interface JobQuery {
  status: JobStatus | null;
  verdict: JobVerdict | null;
  runId: number | null;
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
  rejected: number;
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
  rejection_code: string | null;
  rejection_params: string | null;
  is_aggregator: number;
  is_uncertain: number;
  stack_match: string;
  apply_url: string | null;
  contact_email: string | null;
  judge_status: JudgeStatus;
  status: JobStatus;
  found_at: string;
  posted_at: string | null;
  applications: number | null;
  response_days_min: number | null;
  response_days_max: number | null;
  run_id: number | null;
}

const JOB_COLUMNS = `id, source, fingerprint, title, role, company, author, text, url, location, location_kind,
  verdict, rejection_reason, rejection_code, rejection_params, is_aggregator, is_uncertain, stack_match, apply_url, contact_email,
  judge_status, status, found_at, posted_at, run_id,
  applications, response_days_min, response_days_max`;

function parseParams(raw: string | null): Record<string, string | number> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, string | number>)
      : null;
  } catch {
    return null;
  }
}

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
    rejectionCode: row.rejection_code,
    rejectionParams: parseParams(row.rejection_params),
    isAggregator: row.is_aggregator === 1,
    judgeStatus: row.judge_status,
    status: row.status,
    foundAt: row.found_at,
    postedAt: row.posted_at,
    applications: row.applications,
    responseDays: row.response_days_min || row.response_days_max
      ? { min: row.response_days_min, max: row.response_days_max }
      : null,
    stackMatch: JSON.parse(row.stack_match) as string[],
    locationKind: row.location_kind,
    applyUrl: row.apply_url,
    contactEmail: row.contact_email,
    isUncertain: row.is_uncertain === 1,
    runId: row.run_id,
  };
}

export class JobsRepository {
  constructor(private readonly db: Db) {}

  insert(job: NewJob): boolean {
    const result = this.db.prepare(`
      INSERT OR IGNORE INTO jobs (source, fingerprint, title, role, company, author, text, url, location, location_kind,
        verdict, rejection_reason, rejection_code, rejection_params, is_aggregator, is_uncertain, stack_match, apply_url, contact_email,
        judge_status, status, found_at, posted_at, run_id,
        applications, response_days_min, response_days_max)
      VALUES (@source, @fingerprint, @title, @role, @company, @author, @text, @url, @location, @locationKind,
        @verdict, @rejectionReason, @rejectionCode, @rejectionParamsJson, @isAggregator, @isUncertain, @stackMatch, @applyUrl, @contactEmail,
        @judgeStatus, @status, @foundAt, @postedAt, @runId,
        @applications, @responseDaysMin, @responseDaysMax)
    `).run({
      ...job,
      isAggregator: job.isAggregator ? 1 : 0,
      isUncertain: job.isUncertain ? 1 : 0,
      stackMatch: JSON.stringify(job.stackMatch),
      rejectionCode: job.rejectionCode ?? null,
      rejectionParamsJson: job.rejectionParams ? JSON.stringify(job.rejectionParams) : null,
      applications: job.applications ?? null,
      responseDaysMin: job.responseDays?.min ?? null,
      responseDaysMax: job.responseDays?.max ?? null,
      status: JobStatus.New,
      foundAt: job.foundAt ?? new Date().toISOString(),
      runId: job.runId ?? null,
    });
    return result.changes > 0;
  }

  refreshMetrics(source: string, fingerprint: string, metrics: PostMetrics): void {
    this.db.prepare(`
      UPDATE jobs SET posted_at = ?, applications = ?, response_days_min = ?, response_days_max = ?
      WHERE source = ? AND fingerprint = ?
    `).run(
      metrics.postedAt,
      metrics.applications,
      metrics.responseDays?.min ?? null,
      metrics.responseDays?.max ?? null,
      source,
      fingerprint,
    );
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
      `SELECT ${JOB_COLUMNS} FROM jobs ${where}
       ORDER BY COALESCE(posted_at, found_at) DESC, id DESC LIMIT ? OFFSET ?`,
    ).all(...params, query.limit, query.offset);
    return { items: rows.map(toJob), total };
  }

  stats(): JobStats {
    const rows = this.db.prepare<[], { status: JobStatus; count: number }>(
      `SELECT status, COUNT(*) AS count FROM jobs
       WHERE verdict = '${JobVerdict.Accepted}'
       GROUP BY status`,
    ).all();
    const byStatus = Object.fromEntries(Object.values(JobStatus).map((s) => [s, 0])) as Record<JobStatus, number>;
    let total = 0;
    for (const row of rows) {
      byStatus[row.status] = row.count;
      total += row.count;
    }
    const rejected = this.db.prepare<[], { count: number }>(
      `SELECT COUNT(*) AS count FROM jobs WHERE verdict = '${JobVerdict.Rejected}'`,
    ).get()?.count ?? 0;
    return { new: byStatus[JobStatus.New], saved: byStatus[JobStatus.Saved], total, rejected, byStatus };
  }

  private buildWhere(query: JobQuery): { where: string; params: Array<string | number> } {
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    if (query.verdict) { clauses.push('verdict = ?'); params.push(query.verdict); }
    if (query.runId !== null) { clauses.push('run_id = ?'); params.push(query.runId); }
    if (query.status) { clauses.push('status = ?'); params.push(query.status); }
    if (query.source) { clauses.push('source = ?'); params.push(query.source); }
    if (query.search) {
      clauses.push('(text LIKE ? OR author LIKE ?)');
      params.push(`%${query.search}%`, `%${query.search}%`);
    }
    if (query.hasApply !== null) {
      clauses.push(query.hasApply ? '(apply_url IS NOT NULL OR contact_email IS NOT NULL)' : '(apply_url IS NULL AND contact_email IS NULL)');
    }
    return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
  }
}
