/** Hora de Venezuela: UTC-4 fijo, sin horario de verano. */
const VET_OFFSET_MS = 4 * 60 * 60 * 1000;

/**
 * Cómo se llama esa hora cuando se le enseña a alguien.
 *
 * Vive aquí, junto al desfase, y viaja hasta la interfaz por la API. Las horas
 * de las pasadas se configuran con `SCHEDULE_HOURS`, así que escribirlas en el
 * dashboard —"9:00, 13:00 o 18:00"— era contar una verdad que deja de serlo en
 * cuanto alguien cambia el `.env`. Y sin decir la zona, un "18:00" no dice nada.
 */
export const SCHEDULE_TIMEZONE = 'hora de Venezuela';

interface PassSlot {
  date: string;
  hour: number;
  recovered: boolean;
}

export interface LastPass {
  date: string;
  hour: number;
}

export function toVet(now: Date): Date {
  return new Date(now.getTime() - VET_OFFSET_MS);
}

/**
 * El instante en que empezó el día DE VENEZUELA que se está viviendo ahora.
 *
 * El presupuesto diario de lecturas se cuenta por días venezolanos, no por días
 * UTC: si el corte fuera a medianoche UTC, el contador se reiniciaría a las
 * 8 de la noche hora del señor y la tarde tendría presupuesto doble.
 */
export function vetDayStart(now: Date): Date {
  const vet = toVet(now);
  const midnightVet = Date.UTC(vet.getUTCFullYear(), vet.getUTCMonth(), vet.getUTCDate());
  return new Date(midnightVet + VET_OFFSET_MS);
}

/** La franja más tardía de las que ya han llegado hoy. Solo esa: el feed es un directo. */
export function currentSlot(vet: Date, hours: readonly number[]): { date: string; hour: number } | undefined {
  const reached = hours.filter((h) => h <= vet.getUTCHours());
  const hour = Math.max(...reached);
  if (!reached.length) return undefined;
  return { date: vet.toISOString().slice(0, 10), hour };
}

/**
 * ¿Toca mirar, y por qué franja? Responde a "¿cuál es la última franja que YA
 * pasó hoy y no se ha hecho?", no a "¿es esta hora exacta?". Así una franja
 * perdida por reiniciar el servidor se recupera en vez de evaporarse.
 */
export function shouldRunPass(vet: Date, hours: readonly number[], last?: LastPass): PassSlot | undefined {
  const slot = currentSlot(vet, hours);
  if (!slot) return undefined;
  if (last && last.date === slot.date && last.hour >= slot.hour) return undefined;
  return { ...slot, recovered: vet.getUTCHours() !== slot.hour };
}
