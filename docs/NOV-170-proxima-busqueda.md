# NOV-170 — Cuándo toca la próxima búsqueda

**Qué resuelve:** muestra en la barra lateral, bajo "Dashboard", cuánto falta para la próxima búsqueda del servidor. Si la última pasada falló, lo dice antes en rojo.

## Backend — (sin sección en esta pasada)

Esta pasada es solo de Frontend. El indicador usa `GET /api/schedule` y `GET /api/stats` tal como existen; no se añadió ningún endpoint ni se cambió el horario.

## Frontend — NOV-171 · Frontend Developer · 2026-11-11

### Componentes
#### NextSearchIndicator (web/src/layouts/full/vertical/sidebar/NextSearchIndicator.tsx)
Línea de cuenta atrás justo bajo el enlace Dashboard. Pide `getSchedule()` una vez al montar. Mantiene `now` en estado y lo refresca cada 30 s, y también al volver a pestaña visible; no refresca con la pestaña oculta.
- Props: `lastRunFailed: boolean`.
- Estado: `schedule: Schedule | null`, `now: Date`.
- Sin horario (carga pendiente, API caída o lista vacía) no pinta nada.
- Con `lastRunFailed`, primero "La última búsqueda falló" en `error.main` y negrita; debajo la cuenta atrás en `text.secondary`.
- Alineado con la etiqueta del Dashboard (padding izquierdo de 52 px, después del icono de 36 px).

Diseño: `impeccable` NO aparece en mi listado de skills. La leí del disco (`/Users/navas/PROGRAMACION/SKILLS/impeccable/SKILL.md` y `reference/craft-floor.md`), y lo hice DESPUÉS de escribir el componente, no antes: el orden que pide la norma se rompió. Seguí `DESIGN.md` (secciones de piloto y de barra lateral). Al revisar `craft-floor` no encontré nada que cambiar: sin degradados, sin borde lateral de color, y el contraste de `text.secondary` y de `error.main` sobre la superficie ronda 6:1.

### Funciones
#### nextSearchIn(hours: number[], now: Date): NextSearch | null (web/src/views/jobs/scheduleText.ts)
Devuelve la primera hora programada estrictamente posterior a `now`, leída en hora de Venezuela (UTC-4 fijo, constante `VET_OFFSET_HOURS`). Si ya no quedan horas hoy, devuelve la primera de mañana. Entrada vacía → `null`. Recibe las horas en cualquier orden y las ordena.

#### formatNextSearch(next: NextSearch): string (web/src/views/jobs/scheduleText.ts)
- Menos de 1 min → "Próxima en menos de 1 min".
- 6 h o más → "Próxima a las 9:00 am" (reusa `hourLabel`).
- Menos de 6 h → "Próxima en 2 h 14 min"; si los minutos son 0, "Próxima en 2 h"; si no hay horas, "Próxima en 45 min".

## Modelo de datos
Sin cambios. Usa `Schedule { hours: number[]; timezone: string }` y `Stats.lastRun`.

## Cómo verificarlo
Desde la raíz del proyecto:

```
cd /Users/navas/PROGRAMACION/novus-jobs/web && npm install && npm run build
cd ../server && npm run build
DATA_DIR=/tmp/novus-jobs-check SCHEDULER_ENABLED=false PORT=47841 node dist/index.js
```

Abrir `http://127.0.0.1:47841/`. Bajo "Dashboard" debe verse "Próxima en …" o "Próxima a las …". Con una pasada fallida, "La última búsqueda falló" aparece encima. Con la API caída no aparece nada y el menú sigue funcionando.

## GAPs y decisiones
- Sin runner de tests en `web`: la función pura no tiene tests automáticos. Se comprobó con un script externo sobre 10 casos (frontera de hora, medianoche, menos de 1 min, 6 h).
- "Próxima en 2 h" sin minutos cuando el resto es 0 (la especificación no lo fijaba).
- Con horario pero sin pasada, o con la API caída, no se muestra el aviso de fallo: la especificación dice que sin horario no se pinta nada.
- Sin verificación visual en pantalla: `chrome` no lista el texto del menú porque el cajón está acoplado; se confirmó en el DOM.
