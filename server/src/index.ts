import { GoogleGenAI } from '@google/genai';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildApp } from './app.js';
import { migrateProfile } from './browser/migrate.js';
import { BrowserPool } from './browser/session.js';
import { legacyLinkedinProfileDir, loadConfig } from './config.js';
import { openDatabase } from './db/database.js';
import { JobsRepository } from './db/jobs.repository.js';
import { RunsRepository } from './db/runs.repository.js';
import { SettingsRepository } from './db/settings.repository.js';
import { LlmJudge } from './filters/judge.js';
import { PROFILE } from './profile/profile.js';
import { Mailer } from './notify/mailer.js';
import { Runner } from './runner.js';
import { LastPassStore, Scheduler } from './scheduler/scheduler.js';
import { LINKEDIN_PROFILE_ID } from './sources/linkedin.source.js';
import { buildSources } from './sources/registry.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const db = openDatabase(config.dataDir);
  const jobs = new JobsRepository(db);
  const runs = new RunsRepository(db);

  const interrupted = runs.failInterrupted();
  if (interrupted) console.log(`[arranque] ${interrupted} pasada(s) interrumpida(s) cerrada(s) como error`);

  // Un solo navegador por perfil para todo el proceso, pase lo que pase con las
  // fuentes: es lo que garantiza que el ritmo que ve cada plataforma no dependa
  // de cuántas haya activas.
  const pool = new BrowserPool(config.browserProfilesRoot, config.browserHeadless);
  // La sesión que el señor ya tenía, cuando el perfil vivía dentro del repo.
  migrateProfile(legacyLinkedinProfileDir(config), pool.session(LINKEDIN_PROFILE_ID).dir);

  const sources = buildSources(config, pool);
  console.log(`[arranque] fuentes activas: ${sources.map((s) => s.label).join(', ') || 'ninguna'}`);
  const judge = config.geminiApiKey
    ? new LlmJudge(new GoogleGenAI({ apiKey: config.geminiApiKey }), config.judgeModel)
    : null;
  console.log(judge
    ? `[arranque] juez LLM activo (${config.judgeModel})`
    : '[arranque] sin GEMINI_API_KEY: el juez LLM queda desactivado y mandan las reglas');

  const mailer = new Mailer(config.mail);
  console.log(config.mail
    ? `[arranque] avisos por correo a ${config.mail.to}`
    : '[arranque] sin RESEND_API_KEY / MAIL_FROM / MAIL_TO: no se mandan correos');

  const runner = new Runner({
    sources, jobs, runs, judge, profile: PROFILE,
    mailer, dashboardUrl: config.dashboardUrl,
  });
  const scheduler = new Scheduler({
    hours: config.scheduleHours,
    sources,
    store: new LastPassStore(join(config.dataDir, 'last-pass.json')),
    runner,
  });

  const app = await buildApp({
    settings: new SettingsRepository(db),
    jobs,
    runs,
    runner,
    scheduler,
    pool,
    sources,
    scheduleHours: config.scheduleHours,
    gmailAccount: config.gmailAccount,
    webDist: existsSync(config.webDist) ? config.webDist : null,
  });

  const shutdown = async (): Promise<void> => {
    scheduler.stop();
    // El navegador se cierra LIMPIAMENTE antes de salir. Es lo que vuelca la
    // cookie jar al disco y lo que no deja el perfil marcado como ocupado.
    await pool.closeAll();
    await app.close();
    db.close();
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());

  await app.listen({ port: config.port, host: config.host });
  console.log(`[arranque] http://${config.host}:${config.port}`);
  if (config.schedulerEnabled) scheduler.start();
  else console.log('[arranque] planificador desactivado (SCHEDULER_ENABLED=false)');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
