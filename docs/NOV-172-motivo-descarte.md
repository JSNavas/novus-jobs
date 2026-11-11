# NOV-172 — El motivo del descarte, legible de un vistazo en la auditoría

**Qué resuelve:** en "Descartadas por el filtro" cada oferta muestra por qué
se descartó: un distintivo corto con la categoría (p. ej. "Presencial") y el
motivo completo debajo, visible sin ratón. Así un criterio mal aplicado se ve
y se corrige sin abrir la base de datos.

## Backend — NOV-172 · Backend Developer · pendiente

Sin cambios de Frontend en esta sección. El motivo ya llega en
`job.rejectionReason` (string | null); esta tarea no añade endpoints ni datos.

## Frontend — NOV-173 · Frontend Developer · 2026-11-11

Diseño: skill invocada: NO, no aparece en mi listado (`Skill impeccable` →
"Unknown skill: impeccable"). Leí la guía del disco
(`/Users/navas/PROGRAMACION/SKILLS/impeccable/SKILL.md` y `reference/craft-floor.md`)
y apliqué de ella: sin sombra ni borde de color lateral; la etiqueta va en
sans, no en mono (el mono es para cifras e identificadores). Los tonos salen de
`AppChip` (ámbar/gris), no de colores a pelo. El distintivo no es enfocable
(ver abajo): no hay foco que pintar.

### Componentes
#### RejectionBadge (web/src/views/jobs/RejectionBadge.tsx)
Distintivo de una oferta descartada. Muestra la categoría en un `AppChip` y,
debajo, el motivo completo en `caption` gris.
- Props: `reason: string` (el `rejectionReason` de la oferta, no nulo).
- El chip va dentro de un `Tooltip` con el motivo completo. El contenedor es un
  `span` sin `tabIndex`: no es tab stop a propósito. QA lo marcó porque un tab
  stop sin rol ni nombre anunciado no aporta nada, y el motivo ya está en la
  línea visible. El `Tooltip` lleva `describeChild`: el motivo va como
  descripción (`aria-describedby`), no como `aria-label` sobre un `span` sin
  rol, que es lo que avisó `verificar --puerta`.
- La línea visible con el motivo es la que cuenta sin ratón y para lector de
  pantalla; el tooltip es solo un refuerzo para ratón. Antes (commit ab38d39)
  el contenedor tenía `tabIndex={0}` con contorno de foco en `primary.main`;
  se quitó tras la revisión de QA.
- Estado: sin estado propio.

### Funciones
#### rejectionCategory(reason: string): RejectionCategory (web/src/views/jobs/rejectionReason.ts)
Función pura. Busca el motivo en una lista ordenada de expresiones regulares y
devuelve `{ label, tone }`. Sin coincidencia devuelve "Otro motivo" en gris.
- Las expresiones son los textos que emiten `server/src/filters/decide.ts` y
  `server/src/pipeline.ts`. Si el backend cambia esos textos, este mapeo hay
  que actualizarlo; sin coincidencia no rompe nada, solo cae en "Otro motivo".
- Tono: solo `warning` (ámbar) o `neutral` (gris). Nunca rojo: el rojo ya lo
  lleva el chip "Descartada por el filtro" y un descarte no es un fallo.
  - Ámbar, para juicios discutibles: "Rechazo IA", "Otro ecosistema",
    "Solo periférico".
  - Gris, para hechos verificables de la oferta: el resto.
- Prefijo `[IA]`: lo añade `pipeline.ts` cuando la IA rechaza. Se detecta por
  el prefijo y se muestra como "Rechazo IA".

### Cambios sobre lo existente
- `web/src/views/jobs/JobCard.tsx`: el aviso `AppAlert severity="warning"` con
  el texto "Descartada: <motivo>" se sustituye por `<RejectionBadge>`. Antes:
  texto corrido en un aviso ámbar de ancho completo. Ahora: categoría corta y
  motivo debajo. Se conserva la condición (`job.rejectionReason` no nulo) y el
  comentario del porqué, traducido al inglés.

## Modelo de datos
Sin cambios. `Job.rejectionReason: string | null` (ya existía).

## Cómo verificarlo
Arranque (desde la raíz del proyecto, `/Users/navas/PROGRAMACION/novus-jobs`):

```bash
cd web && npm ci && npm run build
cd ../server && npm ci && npm run build && npm start   # http://127.0.0.1:47831
```

Abrir `http://127.0.0.1:47831/rechazadas` ("Descartadas por el filtro").
Qué debe verse: en cada oferta descartada, un chip con la categoría (Presencial,
Otro país, Sin stack, Rechazo IA, etc.) y, debajo, el motivo completo en gris.
Una oferta sin motivo no muestra distintivo.
Comprobado en el DOM servido: aparecen las etiquetas (Rechazo IA, No es oferta,
Otro país, Presencial, Sin stack), el motivo completo en la línea gris y el
chip envuelto en un `span` sin `tabindex`; ya no sale el aviso "Descartada:".
No comprobado: el tooltip al pasar el ratón. `chrome`
solo lee la página, no interactúa; es un GAP de verificación manual.

## GAPs y decisiones
- Test unitario de `rejectionCategory`: no añadido. `web/` no tiene runner de
  tests (ni vitest ni script `test`). La tabla de categorías se comprobó a mano
  con los 11 motivos reales de `decide.ts`/`pipeline.ts`, y todos casan.
- `DESIGN.md` (raíz) describe el motivo como "aviso ámbar que dice 'Descartada: '"
  en la sección Job card y en Avisos. Ya no es así. No lo he editado: está
  fuera de mi alcance y es del board.
- Tonos ámbar/gris: decisión de Frontend, justificada arriba. Si el board
  prefiere otro reparto, es un cambio de una línea por categoría.
