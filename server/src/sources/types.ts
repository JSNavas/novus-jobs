import type { BrowserPool } from '../browser/session.js';
import type { Config } from '../config.js';
import type { LoginWall } from './login-wall.js';
import type { SourcePolicy } from './policy.js';

export interface PostMetrics {
  postedAt: string | null;
  applications: number | null;
  responseDays: { min: number | null; max: number | null } | null;
}

export interface RawPost {
  text: string;
  author: string | null;
  url: string | null;
  metrics?: PostMetrics;
}

export type PermalinkSelector = (posts: readonly RawPost[]) => number[];

export class LoginRequiredError extends Error {
  constructor(readonly source: string, readonly wall: LoginWall, advice: string) {
    super(advice);
    this.name = 'LoginRequiredError';
  }
}

export interface JobSource {
  readonly name: string;
  readonly label: string;
  readonly profileId: string | null;
  readonly loginUrl: string | null;
  readonly policy: SourcePolicy;
  fetch(selectPermalinks: PermalinkSelector): Promise<RawPost[]>;
  close(): Promise<void>;
}

export interface SourceDefinition {
  readonly name: string;
  readonly label: string;
  create(config: Config, pool: BrowserPool): JobSource;
}
