import type { FastifyInstance } from 'fastify';
import type { Runner } from '../runner.js';
import { nextRunAt } from '../scheduler/timing.js';
import {
  MAX_INTERVAL_MINUTES, MIN_INTERVAL_MINUTES, type SourceSchedules,
} from '../sources/schedules.js';
import type { SourceToggles } from '../sources/toggles.js';
import type { JobSource } from '../sources/types.js';

interface IntegrationRoutesDeps {
  sources: readonly JobSource[];
  schedules: SourceSchedules;
  runner: Runner;
  hours: readonly number[];
  timeZone: () => string;
  toggles: SourceToggles;
}

export function registerIntegrationRoutes(app: FastifyInstance, deps: IntegrationRoutesDeps): void {
  const describe = (source: JobSource) => {
    const schedule = deps.schedules.of(source);
    const next = nextRunAt(
      new Date(),
      deps.hours,
      [{ name: source.name, schedule }],
      (name) => deps.runner.lastPassAt(name),
      deps.timeZone(),
    );
    const last = deps.runner.lastPassAt(source.name);
    return {
      name: source.name,
      label: source.label,
      needsLogin: source.loginUrl !== null,
      profileId: source.profileId,
      endpoint: source.endpoint,
      enabled: deps.toggles.isEnabled(source.name),
      schedule: schedule.kind === 'every-minutes'
        ? { kind: 'every-minutes' as const, minutes: schedule.minutes }
        : { kind: 'configured-hours' as const, hours: [...deps.schedules.hoursOf(source)] },
      timezone: deps.timeZone(),
      lastRunAt: last === null ? null : new Date(last).toISOString(),
      nextAt: next === null ? null : new Date(next).toISOString(),
    };
  };

  app.get('/api/integrations', () => deps.sources.map(describe));

  app.put<{ Params: { name: string }; Body: unknown }>('/api/integrations/:name/enabled', (request, reply) => {
    const source = deps.sources.find((s) => s.name === request.params.name);
    if (!source) return reply.code(404).send({ error: 'integración no encontrada' });
    const { enabled } = (request.body ?? {}) as { enabled?: unknown };
    if (typeof enabled !== 'boolean') return reply.code(400).send({ error: 'falta "enabled": true o false' });
    deps.toggles.set(source.name, enabled);
    console.log(`[integraciones] ${source.name}: ${enabled ? 'encendida' : 'apagada'}`);
    return reply.send(describe(source));
  });

  app.put<{ Params: { name: string }; Body: unknown }>('/api/integrations/:name/schedule', (request, reply) => {
    const source = deps.sources.find((s) => s.name === request.params.name);
    if (!source) return reply.code(404).send({ error: 'integración no encontrada' });

    const body = (request.body ?? {}) as { minutes?: unknown; hours?: unknown };

    if (body.minutes !== undefined) {
      const minutes = Number(body.minutes);
      if (!Number.isInteger(minutes) || minutes < MIN_INTERVAL_MINUTES || minutes > MAX_INTERVAL_MINUTES) {
        return reply.code(400).send({
          error: `minutos inválidos: un número entero entre ${MIN_INTERVAL_MINUTES} y ${MAX_INTERVAL_MINUTES}`,
        });
      }
      deps.schedules.save(source, { kind: 'every-minutes', minutes });
      return reply.send(describe(source));
    }

    const hours = body.hours;
    if (!Array.isArray(hours) || hours.length === 0
      || !hours.every((h) => Number.isInteger(h) && (h as number) >= 0 && (h as number) <= 23)) {
      return reply.code(400).send({ error: 'horas inválidas: al menos una, cada una entre 0 y 23' });
    }
    deps.schedules.save(source, {
      kind: 'configured-hours',
      hours: [...new Set(hours as number[])].sort((a, b) => a - b),
    });
    return reply.send(describe(source));
  });
}
