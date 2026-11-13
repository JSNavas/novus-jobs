import type { FastifyInstance } from 'fastify';
import { LinkedInSearches, SearchNotFromLinkedInError } from '../sources/linkedin-searches.js';
import {
  FOCUS_WINDOW_MONTHS_KEY, MAIL_ONLY_NEW_KEY, MAIL_TO_KEY, MAX_AGE_MONTHS_KEY,
  MOTIVATION_TEMPLATE_KEY, type SettingsRepository,
} from '../db/settings.repository.js';
import {
  DEFAULT_FOCUS_MONTHS, DEFAULT_MAX_AGE_MONTHS, defaultMotivationTemplate, MAX_FOCUS_MONTHS,
  MAX_MAX_AGE_MONTHS, MAX_MOTIVATION_CHARS, MIN_FOCUS_MONTHS, MIN_MAX_AGE_MONTHS,
} from '../profile/motivation.js';
import type { Language } from '../profile/types.js';

export interface SettingsRoutesDeps {
  gmailAccount: string | null;
  settings: SettingsRepository;
  language: () => Language;
  /** RESEND_API_KEY y MAIL_FROM presentes en el fichero: sin eso no hay correo posible. */
  mailConfigured: boolean;
  mailFallbackTo: string | null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readMailTo(settings: SettingsRepository, fallback: string | null): string {
  return settings.get(MAIL_TO_KEY) ?? fallback ?? '';
}

export function readMailOnlyNew(settings: SettingsRepository): boolean {
  return settings.get(MAIL_ONLY_NEW_KEY) !== 'false';
}

const MIN_MOTIVATION_CHARS = 50;

export function registerSettingsRoute(app: FastifyInstance, deps: SettingsRoutesDeps): void {
  const fallbackTemplate = (): string => defaultMotivationTemplate(deps.language());
  const motivationTemplate = (): string =>
    deps.settings.get(MOTIVATION_TEMPLATE_KEY) ?? fallbackTemplate();

  app.get('/api/settings', () => ({
    gmailAccount: deps.gmailAccount,
    motivationTemplate: motivationTemplate(),
    defaultMotivationTemplate: fallbackTemplate(),
    maxAgeMonths: readMaxAgeMonths(deps.settings),
    focusWindowMonths: readFocusWindowMonths(deps.settings),
    mailConfigured: deps.mailConfigured,
    mailTo: readMailTo(deps.settings, deps.mailFallbackTo),
    mailOnlyNewOffers: readMailOnlyNew(deps.settings),
    linkedinSearches: new LinkedInSearches(deps.settings).urls(),
  }));

  app.put('/api/settings/linkedin-searches', (request, reply) => {
    const { urls } = (request.body ?? {}) as { urls?: unknown };
    if (!Array.isArray(urls) || urls.some((u) => typeof u !== 'string')) {
      return reply.code(400).send({ error: 'falta "urls": una lista de direcciones' });
    }
    try {
      return reply.send({ urls: new LinkedInSearches(deps.settings).save(urls as string[]) });
    } catch (error) {
      if (error instanceof SearchNotFromLinkedInError) return reply.code(400).send({ error: error.message });
      throw error;
    }
  });

  app.put('/api/settings', (request, reply) => {
    const body = request.body as {
      motivationTemplate?: unknown; maxAgeMonths?: unknown; focusWindowMonths?: unknown;
      mailTo?: unknown; mailOnlyNewOffers?: unknown;
    } | undefined;

    if (body?.mailTo !== undefined) {
      const to = String(body.mailTo).trim();
      if (to !== '' && !EMAIL.test(to)) {
        return reply.code(400).send({ error: 'el correo de aviso no tiene forma de correo' });
      }
      deps.settings.set(MAIL_TO_KEY, to);
    }

    if (body?.mailOnlyNewOffers !== undefined) {
      if (typeof body.mailOnlyNewOffers !== 'boolean') {
        return reply.code(400).send({ error: '«mailOnlyNewOffers» tiene que ser true o false' });
      }
      deps.settings.set(MAIL_ONLY_NEW_KEY, String(body.mailOnlyNewOffers));
    }

    if (body?.mailTo !== undefined || body?.mailOnlyNewOffers !== undefined) {
      if (body.motivationTemplate === undefined && body.maxAgeMonths === undefined
        && body.focusWindowMonths === undefined) {
        return {
          motivationTemplate: motivationTemplate(),
          maxAgeMonths: readMaxAgeMonths(deps.settings),
          focusWindowMonths: readFocusWindowMonths(deps.settings),
          mailConfigured: deps.mailConfigured,
          mailTo: readMailTo(deps.settings, deps.mailFallbackTo),
          mailOnlyNewOffers: readMailOnlyNew(deps.settings),
        };
      }
    }

    if (body?.focusWindowMonths !== undefined) {
      const months = Number(body.focusWindowMonths);
      if (!Number.isInteger(months) || months < MIN_FOCUS_MONTHS || months > MAX_FOCUS_MONTHS) {
        return reply.code(400).send({
          error: `la ventana del Enfoque tiene que ser un número entero entre ${MIN_FOCUS_MONTHS} y ${MAX_FOCUS_MONTHS} meses`,
        });
      }
      deps.settings.set(FOCUS_WINDOW_MONTHS_KEY, String(months));
      if (body.motivationTemplate === undefined && body.maxAgeMonths === undefined) {
        return {
          focusWindowMonths: months,
          maxAgeMonths: readMaxAgeMonths(deps.settings),
          motivationTemplate: motivationTemplate(),
        };
      }
    }

    if (body?.maxAgeMonths !== undefined) {
      const months = Number(body.maxAgeMonths);
      if (!Number.isInteger(months) || months < MIN_MAX_AGE_MONTHS || months > MAX_MAX_AGE_MONTHS) {
        return reply.code(400).send({
          error: `la antigüedad tiene que ser un número entero entre ${MIN_MAX_AGE_MONTHS} y ${MAX_MAX_AGE_MONTHS} meses`,
        });
      }
      deps.settings.set(MAX_AGE_MONTHS_KEY, String(months));
      if (body.motivationTemplate === undefined) {
        return {
          maxAgeMonths: months,
          motivationTemplate: motivationTemplate(),
          focusWindowMonths: readFocusWindowMonths(deps.settings),
        };
      }
    }

    const value = body?.motivationTemplate;
    if (typeof value !== 'string') {
      return reply.code(400).send({ error: 'falta motivationTemplate, y tiene que ser texto' });
    }

    const template = value.trim();
    if (!template) {
      deps.settings.set(MOTIVATION_TEMPLATE_KEY, fallbackTemplate());
      return {
        motivationTemplate: fallbackTemplate(),
        maxAgeMonths: readMaxAgeMonths(deps.settings),
        focusWindowMonths: readFocusWindowMonths(deps.settings),
      };
    }
    if (template.length < MIN_MOTIVATION_CHARS) {
      return reply.code(400).send({
        error: `el texto tiene ${template.length} caracteres y el formulario pide al menos ${MIN_MOTIVATION_CHARS}`,
      });
    }
    if (template.length > MAX_MOTIVATION_CHARS) {
      return reply.code(400).send({
        error: `el texto tiene ${template.length} caracteres y el formulario admite ${MAX_MOTIVATION_CHARS} como mucho`,
      });
    }
    deps.settings.set(MOTIVATION_TEMPLATE_KEY, template);
    return {
      motivationTemplate: template,
      maxAgeMonths: readMaxAgeMonths(deps.settings),
      focusWindowMonths: readFocusWindowMonths(deps.settings),
    };
  });
}

export function readMaxAgeMonths(settings: SettingsRepository): number {
  const stored = Number(settings.get(MAX_AGE_MONTHS_KEY));
  return Number.isInteger(stored) && stored >= MIN_MAX_AGE_MONTHS && stored <= MAX_MAX_AGE_MONTHS
    ? stored
    : DEFAULT_MAX_AGE_MONTHS;
}

export function readFocusWindowMonths(settings: SettingsRepository): number {
  const stored = Number(settings.get(FOCUS_WINDOW_MONTHS_KEY));
  return Number.isInteger(stored) && stored >= MIN_FOCUS_MONTHS && stored <= MAX_FOCUS_MONTHS
    ? stored
    : DEFAULT_FOCUS_MONTHS;
}
