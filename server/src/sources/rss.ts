const ITEM = /<item[^>]*>([\s\S]*?)<\/item>/gi;
const ENTRY = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
const TAG = /<([a-zA-Z][\w:.-]*)(\s[^>]*)?>([\s\S]*?)<\/\1>/g;
const CDATA = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/;

export function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/gi, '&');
}

function valueOf(raw: string): string {
  const cdata = CDATA.exec(raw);
  return decodeEntities(cdata ? cdata[1] ?? '' : raw).trim();
}

function entryOf(block: string): Record<string, string> {
  const entry: Record<string, string> = {};
  for (const match of block.matchAll(TAG)) {
    const name = (match[1] ?? '').toLowerCase();
    const value = valueOf(match[3] ?? '');
    if (!name || value === '' || entry[name] !== undefined) continue;
    entry[name] = value;
  }
  return entry;
}

export function parseFeed(xml: string): Record<string, string>[] {
  const blocks = [...xml.matchAll(ITEM), ...xml.matchAll(ENTRY)];
  return blocks.map((block) => entryOf(block[1] ?? '')).filter((entry) => Object.keys(entry).length > 0);
}
