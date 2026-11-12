export type Result<T> = { value: T } | { error: string };

export function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return values.some((v) => v === value);
}

export function stringParams(raw: unknown): Record<string, string> {
  if (typeof raw !== 'object' || raw === null) return {};
  return Object.fromEntries(Object.entries(raw).flatMap(([key, value]) => (typeof value === 'string' ? [[key, value]] : [])));
}

export function optionalEnum<T extends string>(raw: string | undefined, values: readonly T[], name: string): Result<T | null> {
  if (raw === undefined || raw === '') return { value: null };
  if (isOneOf(values, raw)) return { value: raw };
  return { error: `${name} inválido: "${raw}". Valores admitidos: ${values.join(', ')}` };
}

export function optionalInteger(raw: string | undefined, fallback: number, min: number, max: number, name: string): Result<number> {
  if (raw === undefined || raw === '') return { value: fallback };
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return { error: `${name} debe ser un entero entre ${min} y ${max}` };
  }
  return { value: parsed };
}

export function optionalBoolean(raw: string | undefined, name: string): Result<boolean | null> {
  if (raw === undefined || raw === '') return { value: null };
  if (raw === 'true') return { value: true };
  if (raw === 'false') return { value: false };
  return { error: `${name} debe ser true o false` };
}
