import type { FastifyInstance } from 'fastify';
import { DescribedSource } from '../sources/described.source.js';
import { DescriptorError, parseDescriptor, type SourceDescriptor } from '../sources/descriptor.js';
import type { SourceDescriptors } from '../sources/descriptors.js';
import type { BrowserPool } from '../browser/session.js';
import { biggestList, discover } from '../sources/discover.js';
import { sniff } from '../sources/sniff.js';
import type { DescriptorInventor } from '../sources/invent.js';
import type { SourceToggles } from '../sources/toggles.js';
import type { JobSource } from '../sources/types.js';

const PREVIEW_POSTS = 3;
const PREVIEW_CHARS = 700;

export interface DescriptorRoutesDeps {
  descriptors: SourceDescriptors;
  inventor: DescriptorInventor | null;
  toggles: SourceToggles;
  sources: JobSource[];
  isNative: (name: string) => boolean;
  reload: () => void;
  pool: BrowserPool;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function previewOf(descriptor: SourceDescriptor): Promise<{ count: number; posts: unknown[] }> {
  const posts = await new DescribedSource(descriptor).fetch(() => []);
  return {
    count: posts.length,
    posts: posts.slice(0, PREVIEW_POSTS).map((post) => ({
      employer: post.employer ?? null,
      url: post.url,
      postedAt: post.metrics?.postedAt ?? null,
      text: post.text.slice(0, PREVIEW_CHARS),
    })),
  };
}

export function registerDescriptorRoutes(app: FastifyInstance, deps: DescriptorRoutesDeps): void {
  app.get('/api/descriptors', () => deps.descriptors.all());

  app.post('/api/descriptors/discover', async (request, reply) => {
    const { url } = (request.body ?? {}) as { url?: unknown };
    if (typeof url !== 'string' || url.trim() === '') {
      return reply.code(400).send({ error: 'Falta la dirección.' });
    }
    const found = await discover(url.trim());
    if (found.candidates.length > 0 || !/^https?:\/\//i.test(url.trim())) return found;

    const sniffed = await sniff(deps.pool, url.trim()).catch(() => []);
    if (sniffed.length === 0) return found;
    return {
      candidates: sniffed,
      notes: ['Esa dirección no decía nada por sí sola, así que se abrió en un navegador para ver qué pide al cargar.'],
    };
  });

  app.post('/api/descriptors/invent', async (request, reply) => {
    const { url } = (request.body ?? {}) as { url?: unknown };
    if (typeof url !== 'string' || url.trim() === '') {
      return reply.code(400).send({ error: 'Falta la dirección.' });
    }
    if (!deps.inventor) {
      return reply.code(409).send({
        error: 'Sin GEMINI_API_KEY no se puede escribir el descriptor solo. Pégalo a mano.',
      });
    }

    let payload: unknown;
    try {
      const response = await fetch(url.trim(), {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        return reply.code(422).send({ error: `Esa dirección respondió ${response.status}.` });
      }
      payload = await response.json();
    } catch (error) {
      return reply.code(422).send({ error: `No se pudo leer esa dirección: ${message(error)}` });
    }

    const list = biggestList(payload);
    if (!list) {
      return reply.code(422).send({
        error: 'Esa respuesta no trae ninguna lista de vacantes. ¿Es la dirección de los datos, o la de la página?',
      });
    }

    try {
      const descriptor = await deps.inventor.invent(url.trim(), payload, list.path);
      return { descriptor, preview: await previewOf(descriptor) };
    } catch (error) {
      return reply.code(422).send({ error: message(error) });
    }
  });

  app.post('/api/descriptors/preview', async (request, reply) => {
    try {
      const descriptor = parseDescriptor(request.body);
      return { descriptor, preview: await previewOf(descriptor) };
    } catch (error) {
      const code = error instanceof DescriptorError ? 400 : 422;
      return reply.code(code).send({ error: message(error) });
    }
  });

  app.post('/api/descriptors', async (request, reply) => {
    let descriptor: SourceDescriptor;
    try {
      descriptor = parseDescriptor(request.body);
    } catch (error) {
      return reply.code(400).send({ error: message(error) });
    }
    if (deps.isNative(descriptor.name)) {
      return reply.code(409).send({ error: `Ya hay una plataforma llamada "${descriptor.name}".` });
    }

    deps.descriptors.save(descriptor);
    deps.reload();
    deps.toggles.set(descriptor.name, true);
    return { ok: true, descriptor };
  });

  app.delete('/api/descriptors/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    if (!deps.descriptors.remove(name)) {
      return reply.code(404).send({ error: `No hay ninguna fuente tuya llamada "${name}".` });
    }
    deps.reload();
    return { ok: true };
  });
}
