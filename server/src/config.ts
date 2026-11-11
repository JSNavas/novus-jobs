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
  /**
   * Dónde viven las sesiones del navegador, una carpeta por plataforma.
   *
   * FUERA DEL REPO a propósito. Estaba en `server/data/linkedin-profile`, es
   * decir dentro del árbol que se compila, se despliega y se borra: un
   * `rm -rf data`, un reinstall o mover la carpeta del proyecto se llevaban la
   * sesión por delante y había que volver a iniciarla. La sesión es lo único
   * aquí que no se puede regenerar — la base de datos sí — así que vive donde
   * nada del ciclo de build la toque. Es lo que hace ARTIO con
   * `~/.artio/browser-profile`.
   */
  browserProfilesRoot: string;
  browserHeadless: boolean;
  linkedinFeedUrl: string;
  /**
   * El juez LLM: Gemini, la misma clave y el mismo modelo que ya usa ARTIO.
   * Sin clave, mandan solo las reglas.
   */
  geminiApiKey: string | null;
  judgeModel: string;
  /**
   * Resend, las mismas credenciales que ya usa ARTIO: no se añade ni una
   * cuenta ni una factura. `null` si falta cualquiera de las tres piezas —sin
   * destinatario no hay correo, y a medias no sirve.
   */
  mail: { apiKey: string; from: string; to: string } | null;
  /** A dónde manda el correo. Es la URL de este mismo servidor. */
  dashboardUrl: string;
  /**
   * La cuenta de Gmail DESDE LA QUE ÉL se postula.
   *
   * No tiene nada que ver con Resend. Son dos correos distintos y conviene no
   * mezclarlos nunca: Resend manda los avisos del servidor HACIA él, y esto es
   * la cuenta con la que él escribe a quien contrata. Una candidatura tiene que
   * salir de su dirección personal — un correo de empleo enviado desde el
   * dominio de un servicio no lo abre nadie, y además no sería suyo.
   *
   * Sirve para abrir la sesión correcta: con varias cuentas de Google abiertas,
   * Gmail usa la primera, que puede no ser la suya.
   */
  gmailAccount: string | null;
}

function mailConfig(): Config['mail'] {
  const apiKey = optional('RESEND_API_KEY');
  const from = optional('MAIL_FROM');
  const to = optional('MAIL_TO');
  return apiKey && from && to ? { apiKey, from, to } : null;
}

const SERVER_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const DEFAULT_SCHEDULE_HOURS = '9,13,18';
const DEFAULT_SOURCES = 'linkedin';
const DEFAULT_FEED_URL = 'https://www.linkedin.com/feed/';
/**
 * El modelo del juez. `flash-lite` porque la tarea es clasificar texto corto
 * contra un criterio explícito, no razonar: el barato acierta igual y la capa
 * gratuita da de sobra para tres pasadas al día.
 *
 * Se fija el 3.5 y no el 3.1 que usa ARTIO porque el 3.1 llevaba horas
 * devolviendo 503 por saturación, y un juez que no contesta es un juez
 * apagado. Se cambia con JUDGE_MODEL sin tocar código.
 *
 * Y se deja de usar `-lite` por lo mismo: el 2026-11-11 la pasada de las 13:00
 * perdió sus 19 juicios con `503 This model is currently experiencing high
 * demand`, reintento incluido. El `lite` es el más barato y por eso el más
 * disputado. La tarea sigue siendo clasificar texto corto, así que el salto de
 * precio no compra inteligencia que haga falta: compra que conteste.
 */
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

/** La carpeta donde vivía el perfil de LinkedIn antes de salir del repo. */
export function legacyLinkedinProfileDir(config: Config): string {
  return join(config.dataDir, 'linkedin-profile');
}
