export interface RawPost {
  text: string;
  author: string | null;
  url: string | null;
}

/**
 * La fuente pide esto antes de ir a por los enlaces permanentes: solo se
 * devuelven los índices de las publicaciones que ya encajan por reglas.
 */
export type PermalinkSelector = (posts: readonly RawPost[]) => number[];

export interface JobSource {
  readonly name: string;
  fetch(selectPermalinks: PermalinkSelector): Promise<RawPost[]>;
  close(): Promise<void>;
}
