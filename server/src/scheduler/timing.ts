/**
 * LA ZONA HORARIA DEL USUARIO, y por qué hace falta una.
 *
 * Las franjas de búsqueda son horas de reloj —"a las 9, a la 1 y a las 6"— y
 * una hora de reloj no significa nada sin decir de quién. Esto estaba fijado a
 * UTC-4 porque el proyecto tenía un único usuario y vivía en Venezuela; ahora
 * se toma la zona de la máquina, que es la del que mira el dashboard, y se
 * puede forzar con `TIMEZONE` en el `.env` para quien tenga el servidor en un
 * sitio y a sí mismo en otro.
 *
 * Se resuelve con `Intl` y no con un desfase fijo porque medio mundo tiene
 * horario de verano: un desfase constante acierta media parte del año y
 * desplaza todas las franjas una hora la otra media.
 */
export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/** Cuánto se adelanta esa zona respecto a UTC EN ESE INSTANTE, con su verano incluido. */
export function offsetMsAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant);
  const field = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asIfUtc = Date.UTC(
    field('year'), field('month') - 1, field('day'),
    field('hour') % 24, field('minute'), field('second'),
  );
  // Al segundo: los milisegundos no viajan en `formatToParts`.
  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * El instante, desplazado para que sus `getUTC*` devuelvan la hora LOCAL.
 *
 * Es un truco y conviene saberlo: la fecha que sale no es un instante válido,
 * es un portador de las partes de la hora local. Solo se usa para comparar
 * horas y días dentro de este fichero.
 */
export function toLocalTime(now: Date, timeZone: string): Date {
  return new Date(now.getTime() + offsetMsAt(now, timeZone));
}

interface PassSlot {
  date: string;
  hour: number;
  recovered: boolean;
}

export interface LastPass {
  date: string;
  hour: number;
}

/**
 * El instante en que empezó el día LOCAL que se está viviendo ahora.
 *
 * El presupuesto diario de lecturas se cuenta por días del usuario, no por días
 * UTC: si el corte fuera a medianoche UTC, a quien vive en UTC-4 se le
 * reiniciaría el contador a las 8 de la noche y la tarde tendría presupuesto
 * doble.
 */
export function localDayStart(now: Date, timeZone: string): Date {
  const local = toLocalTime(now, timeZone);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  // El desfase se vuelve a resolver en la medianoche candidata: la noche en que
  // entra o sale el horario de verano, el del mediodía no sirve.
  return new Date(midnight - offsetMsAt(new Date(midnight), timeZone));
}

/** La franja más tardía de las que ya han llegado hoy. Solo esa: el feed es un directo. */
export function currentSlot(local: Date, hours: readonly number[]): { date: string; hour: number } | undefined {
  const reached = hours.filter((h) => h <= local.getUTCHours());
  const hour = Math.max(...reached);
  if (!reached.length) return undefined;
  return { date: local.toISOString().slice(0, 10), hour };
}

/**
 * ¿Toca mirar, y por qué franja? Responde a "¿cuál es la última franja que YA
 * pasó hoy y no se ha hecho?", no a "¿es esta hora exacta?". Así una franja
 * perdida por reiniciar el servidor se recupera en vez de evaporarse.
 */
export function shouldRunPass(local: Date, hours: readonly number[], last?: LastPass): PassSlot | undefined {
  const slot = currentSlot(local, hours);
  if (!slot) return undefined;
  if (last && last.date === slot.date && last.hour >= slot.hour) return undefined;
  return { ...slot, recovered: local.getUTCHours() !== slot.hour };
}

/** Lo que el planificador sabe de una fuente para decir cuándo le toca. */
export interface NextRunSource {
  readonly name: string;
  readonly schedule:
    | { readonly kind: 'configured-hours'; readonly hours?: readonly number[] }
    | { readonly kind: 'every-minutes'; readonly minutes: number };
}

/** La franja siguiente a `now`, en milisegundos absolutos. */
function nextSlotAt(now: Date, hours: readonly number[], timeZone: string): number | null {
  const sorted = [...hours].sort((a, b) => a - b);
  const earliest = sorted[0];
  if (earliest === undefined) return null;
  const midnight = localDayStart(now, timeZone).getTime();
  const following = sorted.find((hour) => midnight + hour * 3_600_000 > now.getTime());
  return following === undefined
    ? midnight + 24 * 3_600_000 + earliest * 3_600_000
    : midnight + following * 3_600_000;
}

/**
 * Cuándo vuelve a buscar el sistema: LA MÁS PRÓXIMA DE TODAS LAS FUENTES.
 *
 * El dashboard anunciaba la franja de LinkedIn y punto, así que con Get on
 * Board leyendo cada media hora decía "próxima a las 9:00 am" mientras la
 * siguiente lectura real estaba a veinte minutos. Quien mira quiere saber
 * cuándo entra la próxima oferta, no de qué plataforma viene.
 */
export function nextRunAt(
  now: Date,
  hours: readonly number[],
  sources: readonly NextRunSource[],
  lastPassAt: (source: string) => number | null,
  timeZone: string,
): number | null {
  const candidates: number[] = [];
  for (const source of sources) {
    if (source.schedule.kind === 'every-minutes') {
      const last = lastPassAt(source.name);
      const due = last === null ? now.getTime() : last + source.schedule.minutes * 60_000;
      candidates.push(Math.max(due, now.getTime()));
      continue;
    }
    const slot = nextSlotAt(now, source.schedule.hours ?? hours, timeZone);
    if (slot !== null) candidates.push(slot);
  }
  return candidates.length ? Math.min(...candidates) : null;
}
