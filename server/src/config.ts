import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Config {
  port: number;
  host: string;
  serverRoot: string;
  dataDir: string;
  logsDir: string;
  webDist: string;
  scheduleHours: number[];
  schedulerEnabled: boolean;
  enabledSources: string[];
  browserProfilesRoot: string;
  browserHeadless: boolean;
  linkedinFeedUrl: string;
  geminiApiKey: string | null;
  judgeModel: string;
  mail: { apiKey: string; from: string; to: string } | null;
  dashboardUrl: string;
  gmailAccount: string | null;
}

function mailConfig(): Config['mail'] {
  const apiKey = optional('RESEND_API_KEY');
  const from = optional('MAIL_FROM');
  // El destinatario puede venir de la aplicación: aquí solo hace falta con qué mandar.
  return apiKey && from ? { apiKey, from, to: optional('MAIL_TO') ?? '' } : null;
}

const SERVER_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const DEFAULT_SCHEDULE_HOURS = '9,13,18';
const DEFAULT_SOURCES = 'linkedin,linkedin-jobs,getonbrd,hackernews';
const DEFAULT_FEED_URL = 'https://www.linkedin.com/feed/';
const DEFAULT_JUDGE_MODEL = 'gemini-3.5-flash';
const HOME_DIR = join(homedir(), '.novus-jobs');

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
    logsDir: join(dataDir, 'logs'),
    webDist: join(SERVER_ROOT, '..', 'web', 'dist'),
    scheduleHours: parseHours(optional('SCHEDULE_HOURS') ?? DEFAULT_SCHEDULE_HOURS),
    schedulerEnabled: optional('SCHEDULER_ENABLED') !== 'false',
    enabledSources: (optional('JOB_SOURCES') ?? DEFAULT_SOURCES).split(',').map((s) => s.trim()).filter(Boolean),
    browserProfilesRoot: optional('BROWSER_PROFILES_DIR') ?? join(HOME_DIR, 'browser-profiles'),
    browserHeadless: optional('BROWSER_HEADLESS') !== 'false',
    linkedinFeedUrl: optional('LINKEDIN_FEED_URL') ?? DEFAULT_FEED_URL,
    geminiApiKey: optional('GEMINI_API_KEY'),
    judgeModel: optional('JUDGE_MODEL') ?? DEFAULT_JUDGE_MODEL,
    mail: mailConfig(),
    dashboardUrl: optional('DASHBOARD_URL') ?? `http://127.0.0.1:${parsePort(optional('PORT'))}/`,
    gmailAccount: optional('GMAIL_ACCOUNT'),
  };
}

export function legacyLinkedinProfileDir(config: Config): string {
  return join(config.dataDir, 'linkedin-profile');
}
