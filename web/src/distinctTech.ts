const key = (item: string): string => item.toLowerCase().replace(/[.\s_-]/g, '');

/**
 * El perfil guarda los alias de cada tecnología para que el filtro case
 * («Node.js», «NodeJS», «Node»). Para mirar sobra con uno.
 */
export function distinctTech(items: readonly string[]): string[] {
  const kept: string[] = [];
  for (const item of items) {
    const k = key(item);
    const alias = kept.some((other) => {
      const o = key(other);
      return o === k || o.startsWith(k) || k.startsWith(o);
    });
    if (!alias) kept.push(item);
  }
  return kept;
}

/** Quita el alias elegido y todos sus hermanos: si se va «Node.js», se van «NodeJS» y «Node». */
export function removeTech(items: readonly string[], item: string): string[] {
  const target = key(item);
  return items.filter((other) => {
    const o = key(other);
    return !(o === target || o.startsWith(target) || target.startsWith(o));
  });
}

export function hasTech(items: readonly string[], item: string): boolean {
  const target = key(item);
  return items.some((other) => key(other) === target);
}
