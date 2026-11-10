import Anthropic from '@anthropic-ai/sdk';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './db/database.js';
import { JobsRepository } from './db/jobs.repository.js';
import { RunsRepository } from './db/runs.repository.js';
import { ClaudeJudge } from './filters/judge.js';
import { PROFILE } from './profile/profile.js';
import { Runner } from './runner.js';
import { LastPassStore, Scheduler } from './scheduler/scheduler.js';
import { buildSources } from './sources/registry.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const db = openDatabase(config.dataDir);
  const jobs = new JobsRepository(db);
  const runs = new RunsRepository(db);

  const interrupted = runs.failInterrupted();
  if (interrupted) console.log(`[arranque] ${interrupted} pasada(s) interrumpida(s) cerrada(s) como error`);

  const sources = buildSources(config);
  const judge = config.anthropicApiKey
    ? new ClaudeJudge(new Anthropic({ apiKey: config.anthropicApiKey }), config.anthropicModel)
    : null;
  if (!judge) console.log('[arranque] sin ANTHROPIC_API_KEY: el juez LLM queda desactivado y mandan las reglas');

  const runner = new Runner({ sources, jobs, runs, judge, profile: PROFILE });
  const scheduler = new Scheduler({
    hours: config.scheduleHours,
    store: new LastPassStore(join(config.dataDir, 'last-pass.json')),
    runner,
  });

  const app = await buildApp({
    jobs,
    runs,
    runner,
    scheduler,
    webDist: existsSync(config.webDist) ? config.webDist : null,
  });

  const shutdown = async (): Promise<void> => {
    scheduler.stop();
    await Promise.all(sources.map((source) => source.close()));
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
