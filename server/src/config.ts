import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Config {
  port: number;
  host: string;
  serverRoot: string;
  dataDir: string;
  webDist: string;
  scheduleHours: number[];
  schedulerEnabled: boolean;
  enabledSources: string[];
  linkedinFeedUrl: string;
  linkedinProfileDir: string;
  linkedinHeadless: boolean;
  anthropicApiKey: string | null;
  anthropicModel: string;
}

const SERVER_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const DEFAULT_SCHEDULE_HOURS = '9,13,18';
const DEFAULT_SOURCES = 'linkedin';
const DEFAULT_FEED_URL = 'https://www.linkedin.com/feed/';
const DEFAULT_JUDGE_MODEL = 'claude-haiku-5-5';

function optional(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function parseHours(raw: string): number[] {
  const hours = raw.split(',').map((h) => Number(h.trim()));
  const valid = hours.length > 0 && hours.every((h) => Number.isInteger(h) && h >= 0 && h <= 23);
  if (!valid) throw new Error(`SCHEDULE_HOURS inválido: "${raw}". Debe ser una lista de horas 0-23, p. ej. 9,13,18`);
  return [...new Set(hours)].sort((a, b) => a - b);
}

function parsePort(raw: string | null): number {
  if (raw === null) return 47831;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`PORT inválido: "${raw}"`);
  return port;
}

export function loadConfig(): Config {
  const envFile = join(SERVER_ROOT, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const dataDir = optional('DATA_DIR') ?? join(SERVER_ROOT, 'data');
  return {
    port: parsePort(optional('PORT')),
    host: '127.0.0.1',
    serverRoot: SERVER_ROOT,
    dataDir,
    webDist: join(SERVER_ROOT, '..', 'web', 'dist'),
    scheduleHours: parseHours(optional('SCHEDULE_HOURS') ?? DEFAULT_SCHEDULE_HOURS),
    schedulerEnabled: optional('SCHEDULER_ENABLED') !== 'false',
    enabledSources: (optional('JOB_SOURCES') ?? DEFAULT_SOURCES).split(',').map((s) => s.trim()).filter(Boolean),
    linkedinFeedUrl: optional('LINKEDIN_FEED_URL') ?? DEFAULT_FEED_URL,
    linkedinProfileDir: optional('LINKEDIN_PROFILE_DIR') ?? join(dataDir, 'linkedin-profile'),
    linkedinHeadless: optional('LINKEDIN_HEADLESS') !== 'false',
    anthropicApiKey: optional('ANTHROPIC_API_KEY'),
    anthropicModel: optional('ANTHROPIC_MODEL') ?? DEFAULT_JUDGE_MODEL,
  };
}
