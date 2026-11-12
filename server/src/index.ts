import { GoogleGenAI } from '@google/genai';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildApp } from './app.js';
import type { CandidateProfile } from './profile/types.js';
import { migrateProfile } from './browser/migrate.js';
import { BrowserPool } from './browser/session.js';
import { legacyLinkedinProfileDir, loadConfig } from './config.js';
import { openDatabase } from './db/database.js';
import { JobsRepository } from './db/jobs.repository.js';
import { RunsRepository } from './db/runs.repository.js';
import { readMaxAgeMonths } from './routes/settings.js';
import { SettingsRepository } from './db/settings.repository.js';
import { LlmJudge } from './filters/judge.js';
import { CvEnhancer } from './cv/enhance.js';
import { ProfileRepository } from './profile/profile.repository.js';
import { Mailer } from './notify/mailer.js';
import { readMailOnlyNew, readMailTo } from './routes/settings.js';
import { Runner } from './runner.js';
import { LastPassStore, Scheduler } from './scheduler/scheduler.js';
import { systemTimeZone } from './scheduler/timing.js';
import { LINKEDIN_PROFILE_ID } from './sources/linkedin.source.js';
import { SourceSchedules } from './sources/schedules.js';
import { buildDescribedSources, buildSources, isNativeSource, registerDescriptors } from './sources/registry.js';
import { DescriptorInventor } from './sources/invent.js';
import { readCatalog, SourceDescriptors } from './sources/descriptors.js';
import { HiddenSources } from './sources/hidden.js';
import { SourceToggles } from './sources/toggles.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const db = openDatabase(config.dataDir);
  const jobs = new JobsRepository(db);
  const runs = new RunsRepository(db);
  const settings = new SettingsRepository(db);

  const interrupted = runs.failInterrupted();
  if (interrupted) console.log(`[arranque] ${interrupted} pasada(s) interrumpida(s) cerrada(s) como error`);

  const pool = new BrowserPool(config.browserProfilesRoot, config.browserHeadless);
  migrateProfile(legacyLinkedinProfileDir(config), pool.session(LINKEDIN_PROFILE_ID).dir);

  const descriptors = new SourceDescriptors(settings);
  const catalog = readCatalog(join(config.serverRoot, 'descriptors'));
  const described = [...catalog, ...descriptors.all()];
  registerDescriptors(described);
  if (described.length) {
    console.log(`[arranque] ${described.length} fuente(s) descrita(s) con JSON: ${described.map((d) => d.label).join(', ')}`);
  }
  const sources = buildSources(config, pool).filter((source) => !new HiddenSources(settings).has(source.name));
  const hidden = new HiddenSources(settings);
  const reloadDescribed = (): void => {
    registerDescriptors([...catalog, ...descriptors.all()]);
    const natives = buildSources(config, pool).filter((source) => isNativeSource(source.name));
    sources.splice(
      0,
      sources.length,
      ...[...natives, ...buildDescribedSources(pool)].filter((source) => !hidden.has(source.name)),
    );
  };
  const gemini = config.geminiApiKey ? new GoogleGenAI({ apiKey: config.geminiApiKey }) : null;
  const judge = gemini ? new LlmJudge(gemini, config.judgeModel) : null;
  const enhancer = gemini ? new CvEnhancer(gemini, config.judgeModel) : null;
  console.log(judge
    ? `[arranque] juez LLM activo (${config.judgeModel})`
    : '[arranque] sin GEMINI_API_KEY: el juez LLM queda desactivado y mandan las reglas');

  const mailer = new Mailer(config.mail, {
    to: () => readMailTo(settings, config.mail?.to ?? null) || null,
    onlyNewOffers: () => readMailOnlyNew(settings),
  });
  console.log(mailer.enabled()
    ? `[arranque] avisos por correo a ${mailer.recipient()}`
      + `${mailer.warnsEnabled() ? '' : ' (solo ofertas nuevas)'}`
    : '[arranque] sin RESEND_API_KEY / MAIL_FROM o sin destinatario: no se mandan correos');

  const toggles = new SourceToggles(settings, [...config.enabledSources, ...catalog.map((d) => d.name)]);
  const enabled = (name: string): boolean => toggles.isEnabled(name);
  console.log(`[arranque] plataformas: ${sources.map((s) => `${s.label}${enabled(s.name) ? '' : ' (apagada)'}`).join(', ') || 'ninguna'}`);
  const profiles = new ProfileRepository(settings);
  const profile = (): CandidateProfile => profiles.get();
  const onboarded = (): boolean => profiles.isOnboarded();
  const timeZone = (): string => profile().geo.timezone || systemTimeZone();
  console.log(onboarded()
    ? `[arranque] perfil cargado: ${profile().core.length} tecnologías de núcleo, inglés ${profile().english.level.toUpperCase()}, zona ${timeZone()}`
    : '[arranque] sin alta: abre el dashboard y completa tu perfil para que empiecen las búsquedas');
  const runner = new Runner({
    sources,
    maxAgeDays: () => readMaxAgeMonths(settings) * 30, jobs, runs, judge, profile, onboarded, enabled, timeZone,
    mailer, dashboardUrl: config.dashboardUrl,
  });
  const schedules = new SourceSchedules(settings, config.scheduleHours);
  const scheduler = new Scheduler({
    hours: config.scheduleHours,
    sources,
    schedules,
    store: new LastPassStore(join(config.dataDir, 'last-pass.json')),
    runner,
    enabled,
    timeZone,
  });

  const app = await buildApp({
    descriptors,
    inventor: gemini ? new DescriptorInventor(gemini, config.judgeModel) : null,
    isNativeSource,
    reloadDescribed,
    hidden,
    settings,
    profile,
    jobs,
    runs,
    runner,
    scheduler,
    pool,
    sources,
    scheduleHours: config.scheduleHours,
    schedules,
    gmailAccount: config.gmailAccount,
    mailConfigured: config.mail !== null,
    mailFallbackTo: config.mail?.to || null,
    toggles,
    dataDir: config.dataDir,
    timeZone,
    enhancer,
    profiles,
    webDist: existsSync(config.webDist) ? config.webDist : null,
  });

  const shutdown = async (): Promise<void> => {
    scheduler.stop();
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
