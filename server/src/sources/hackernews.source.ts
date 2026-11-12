import { plainText } from './html.js';
import { OPEN_API_POLICY } from './policy.js';
import type { FreshnessCheck, JobSource, PermalinkSelector, PostMetrics, RawPost } from './types.js';

const STORIES_URL = 'https://hn.algolia.com/api/v1/search_by_date';
const COMMENTS_URL = 'https://hn.algolia.com/api/v1/search';
const THREAD_TITLE = /who is hiring/i;
const TIMEOUT_MS = 20_000;
const COMMENTS_PER_PAGE = 100;
const MAX_PAGES = 3;
const MIN_COMMENT_LENGTH = 80;
const HEADLINE_SEPARATOR = '|';

interface Story {
  readonly objectID: string;
  readonly title: string;
}

interface Comment {
  readonly objectID: string;
  readonly comment_text: string | null;
  readonly parent_id: number | null;
  readonly story_id: number | null;
  readonly created_at_i: number | null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function askAlgolia(url: URL): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${url.href} respondió ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as Record<string, unknown>;
}

function headlineOf(body: string): { title: string; company: string } {
  const line = body.split('\n').map((l) => l.trim()).find((l) => l !== '') ?? '';
  const at = line.indexOf(HEADLINE_SEPARATOR);
  if (at <= 0) return { title: line, company: '' };
  return { title: line.slice(at + 1).trim() || line, company: line.slice(0, at).trim() };
}

function toMetrics(comment: Comment): PostMetrics {
  return {
    postedAt: comment.created_at_i ? new Date(comment.created_at_i * 1000).toISOString() : null,
    applications: null,
    responseDays: null,
  };
}

export class HackerNewsSource implements JobSource {
  readonly name = 'hackernews';
  readonly label = 'Hacker News (Who is hiring)';
  readonly endpoint = `${STORIES_URL}?tags=story,author_whoishiring`;
  readonly profileId = null;
  readonly loginUrl = null;
  readonly policy = OPEN_API_POLICY;

  async fetch(_selectPermalinks: PermalinkSelector, isFresh?: FreshnessCheck): Promise<RawPost[]> {
    const story = await this.currentThread();
    const posts: RawPost[] = [];

    for (let page = 0; page < MAX_PAGES; page++) {
      const comments = await this.comments(story.objectID, page);
      if (comments.length === 0) break;
      const pagePosts: RawPost[] = [];
      for (const comment of comments) {
        const post = this.toRawPost(comment, story);
        if (post) pagePosts.push(post);
      }
      posts.push(...pagePosts);
      if (comments.length < COMMENTS_PER_PAGE) break;
      if (isFresh && !pagePosts.some((post) => isFresh(post.text))) break;
    }

    if (posts.length === 0) {
      throw new Error(
        `el hilo "${story.title}" no trajo ofertas utilizables: ¿cambió la forma de la respuesta de Algolia?`,
      );
    }
    return posts;
  }

  async close(): Promise<void> {}

  private async currentThread(): Promise<Story> {
    const url = new URL(STORIES_URL);
    url.searchParams.set('tags', 'story,author_whoishiring');
    url.searchParams.set('hitsPerPage', '10');

    const payload = await askAlgolia(url);
    const hits = Array.isArray(payload.hits) ? (payload.hits as Record<string, unknown>[]) : [];
    const story = hits.find((hit) => THREAD_TITLE.test(text(hit.title)));
    if (!story) {
      throw new Error(
        'no se encontró ningún hilo "Ask HN: Who is hiring?" entre las últimas publicaciones de whoishiring',
      );
    }
    return { objectID: text(story.objectID), title: text(story.title) };
  }

  private async comments(storyId: string, page: number): Promise<Comment[]> {
    const url = new URL(COMMENTS_URL);
    url.searchParams.set('tags', `comment,story_${storyId}`);
    url.searchParams.set('hitsPerPage', String(COMMENTS_PER_PAGE));
    url.searchParams.set('page', String(page));

    const payload = await askAlgolia(url);
    return Array.isArray(payload.hits) ? (payload.hits as unknown as Comment[]) : [];
  }

  private toRawPost(comment: Comment, story: Story): RawPost | null {
    if (comment.parent_id !== null && comment.story_id !== null && comment.parent_id !== comment.story_id) {
      return null;
    }

    const body = plainText(text(comment.comment_text)).trim();
    if (body.length < MIN_COMMENT_LENGTH) return null;

    const { title, company } = headlineOf(body);
    if (!title) return null;

    const url = `https://news.ycombinator.com/item?id=${comment.objectID}`;
    const head = [company ? `${company} busca: ${title}` : title, `Hilo: ${story.title}`, `Postular: ${url}`];

    return {
      text: [head.join('\n'), body].join('\n\n'),
      author: company || null,
      employer: company || null,
      url,
      metrics: toMetrics(comment),
    };
  }
}
