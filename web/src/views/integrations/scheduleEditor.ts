/**
 * Las reglas del horario, fuera de la pantalla que las usa.
 *
 * Son las mismas que valida el servidor. Repetirlas aquí no es duplicar la
 * verdad: es poder decir "mínimo 5 minutos" ANTES de mandar la petición, que
 * es cuando la frase sirve de algo. El servidor sigue siendo el que manda.
 */
export const MIN_INTERVAL_MINUTES = 5;
export const MAX_INTERVAL_MINUTES = 24 * 60;

/** Atajos de ritmo: lo que de verdad se elige, sin teclear. */
export const INTERVAL_PRESETS = [15, 30, 60, 120, 180, 360, 720] as const;

export function intervalLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return hours === 1 ? '1 hora' : `${hours} horas`;
  return `${hours} h ${rest} min`;
}

export function intervalError(raw: string): string | null {
  const minutes = Number(raw);
  if (!Number.isInteger(minutes)) return 'Escribe un número entero de minutos.';
  if (minutes < MIN_INTERVAL_MINUTES) return `Mínimo ${MIN_INTERVAL_MINUTES} minutos: por debajo es martillear la plataforma.`;
  if (minutes > MAX_INTERVAL_MINUTES) return 'Máximo 24 horas.';
  return null;
}

/** "9:00 am", como lo dice una persona. Igual que en el resto de la interfaz. */
export function hourLabel(hour: number): string {
  const suffix = hour < 12 ? 'am' : 'pm';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:00 ${suffix}`;
}

export const ALL_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
