# NOV-163 — La Torre de control pasa a ser el tema por defecto

**Qué resuelve:** consolida el tema oscuro "Torre de control" como norma del proyecto: `DESIGN.md` describe lo que el código hace de verdad, y las pantallas siguen ese patrón.

## Backend

Sin cambios de backend en esta tarea.

## Frontend — NOV-164 · Frontend Developer · 2026-11-11

### Qué se corrigió en DESIGN.md (commit `5802562`)
Auditoría de `DESIGN.md` contra `web/src/theme/*`, `views/dashboard/`, `views/jobs/` y `components/ui/`. El código no se tocó.

- **Frontmatter, `caption`:** interlineado 1.66 (el de MUI), no 1rem. El tema no sobrescribe `caption`; el 1rem era el de `body2`.
- **Graphite 300:** el tema lo reserva para `simplebar`, que ninguna pantalla usa. Se documenta como no usado.
- **Densidad:** el padding de tabla es el de `size="small"`, no "estándar".
- **Metric tile:** la bandeja (`StatsRow`) pinta sus cifras en `h5` sin mono. Se marca como excepción pendiente.
- **Dashboard card:** exportada pero sin uso. Su padding efectivo es 39px (15px del `MuiCard` del tema + 24px de `CardContent`), no 24px.
- **`btn-xs`:** definida en `Components.tsx`, sin uso hoy.
- **Inputs:** el estado de error lo pinta MUI por defecto; el tema no lo sobrescribe.
- **Navegación:** añadidos los subtítulos "Ofertas" y "Auditoría" y el enlace activo.
- **Paginación:** se documenta que no se pinta con una sola página.
- **Nuevas secciones:** pestañas (`AppTabs`), diálogo (`AppDialog`) y aviso flotante (`AppSnackbar`).
- **"Cómo seguir el patrón":** checklist al final.

### GAPs (código, fuera del alcance de esta subtarea)
- `StatsRow` no sigue el patrón de cifras (overline + `metric`). Pendiente de unificar.
- `DashboardCard` tiene 39px de padding efectivo por el `MuiCard` del tema. Hay que quitar el padding del `Card` en `Components.tsx` o en el componente antes de usarlo.
- `JobCard` usa `fontFamily: 'monospace'` y `fontSize: 13` a pelo en la pre de la oferta, en vez de un token del tema.

### Verificación
- `grep -rnE "#[0-9A-Fa-f]{3,6}|rgba?\(" web/src | grep -v src/theme/`: sin resultados.
- Cambio solo de documentación: no hay build que arrancar. Verificado leyendo el código citado en cada punto.

## Frontend — NOV-165 · Frontend Developer · 2026-11-11

### Qué se limpió en `web/src/theme/Components.tsx`
Sin cambio visual: ninguno de los selectores retirados tiene uso en `web/src` (buscado por nombre de clase, keyframe y componente MUI).

- **Plantilla Modernize eliminada (sin uso):** `.border-none`, `[dir='rtl'] .buyNowImg`, `.hover-text-primary`, `.hoverCard:hover`, `.signup-bg`, `.emoji-picker-react`, `.scrollbar-container`, `.theme-timeline`, `.MuiTimelineConnector-root`, `.rounded-bars`, los `@keyframes gradient` y `slide`, y `MuiAccordion` (no hay acordeones ni timeline).
- **Comentario muerto eliminado:** la línea de `border` comentada en `MuiPaper`.
- **`MuiOutlinedInput`:** la rama `mode === 'dark' ? grey[200] : grey[300]` queda en `grey[200]`. Es la rama que ya se aplicaba, porque el tema es solo oscuro. Trazo en reposo `grey.200`, como indica DESIGN.md.
- **simplebar:** la regla `.simplebar-scrollbar:before` con `grey[300]` se mantiene, porque DESIGN.md reserva ese gris para ella aunque ninguna pantalla use simplebar.

### Tokens que se quedan (DESIGN.md manda)
- `MuiLinearProgress` sigue en `grey[200]`: DESIGN.md lo fija como pista de progreso.
- `.btn-xs` se mantiene: DESIGN.md la documenta como utilidad global aunque hoy nadie la use.
- `.MuiBox-root` (radio base) y `MuiCard` (padding 15px) no se tocan: cambiarlos sí cambia pantallas. El padding del `MuiCard` es el GAP ya documentado de `DashboardCard`.

### Verificación
- `cd web && npx tsc --noEmit`: sin errores.
- `cd web && npx eslint src/theme/Components.tsx`: sin errores.
- `grep -rnE "#[0-9A-Fa-f]{3,6}|rgba?\(" web/src | grep -v src/theme/`: sin resultados.
- `npm run build` no terminó en el primer intento: el `tsc` del build se quedó colgado en esta máquina (load ~150). Build completo con `npx vite build`: `✓ built in 7m 38s`.
- Servido en `http://localhost:47912/` con `vite preview` (PID propio, ya parado). Comprobación visual con `chrome` **no hecha**: el script no respondió en 43 s en ningún puerto, ni en mi build ni en el 47831 del board. Queda como GAP.
- `scripts/verificar --base main`: sin fallos mecánicos.
- Cambio visual esperado: ninguno. Lo retirado no tiene uso, y la rama de `OutlinedInput` que queda es la que ya se aplicaba.

## Frontend — NOV-166 · Frontend Developer · 2026-11-11

### Barrido de `theme/Shadows.tsx`, `DefaultColors.tsx`, `Typography.tsx`, `components/ui/*`, `layouts/full/**`
Resultado: casi limpio. Los tres ficheros de tema ya coinciden con DESIGN.md (paleta, 25 sombras en `none`, escala tipográfica y variantes `metric`/`mono`).
- Colores a pelo (`#hex`, `rgb()`, `rgba()`) fuera de `src/theme/`: ninguno en las rutas del alcance.
- Sombras heredadas: ninguna. Todos los `elevation` son `0` o el valor por defecto que el tema anula.
- Tipografías o radios literales: solo `borderRadius: 1` (múltiplo del radio base, que DESIGN.md documenta en `sx`) y `'50%'` del punto de `AppStatusPilot`, que es un círculo.
- Ramas de modo claro: ninguna (no hay `palette.mode`, `useColorScheme` ni `prefers-color-scheme`).

### Cambio
- **`layouts/full/vertical/sidebar/Sidebar.tsx`**: el logotipo `NOVUS·JOBS` llevaba `fontWeight={700}` por encima de la variante `mono`. DESIGN.md ("Hierarchy", variante `mono`) fija el logotipo en mono 400. Se quita el override y pinta con el peso del tema.
  - Antes: `<Typography variant="mono" color="primary" fontWeight={700}>`
  - Ahora: `<Typography variant="mono" color="primary">`
  - Efecto visual: el logotipo pasa de negrita a peso normal. Es el único cambio visual de la subtarea.

### GAPs
- `chrome` solo lee la estructura: la lista de ofertas aparece vacía en la comprobación porque no hay API levantada. No se verificó la lista con datos reales.
- La comprobación del peso del logotipo se hizo por lectura del código, no con estilos computados en el navegador.
- `scripts/verificar` marca `tsc` como "SIN VERIFICAR (no esta instalado)": el verificador busca `tsc` en la raíz, pero el proyecto está en `web/`. El `tsc --noEmit` se corrió a mano en `web/` y pasa.

### Verificación
- `cd web && npx tsc --noEmit`: sin errores.
- `cd web && npm run lint`: sin errores.
- `scripts/verificar --base main`: sin fallos mecánicos.
- `cd web && npm run build`: OK.
- Servido con `npx vite preview --port 47866 --strictPort` (PID propio, parado al cerrar). El 47831 del board no se tocó.
- `chrome http://localhost:47866/nuevas --dom`: el DOM tiene `NOVUS·JOBS`, `Ofertas de empleo` y la navegación. La página no está en blanco.

## Frontend — NOV-167 · Frontend Developer · 2026-11-11

### Qué cambió
- **`views/jobs/JobsPage.tsx`:** el contador "N ofertas nuevas" salía siempre en verde. Ahora es verde solo si hay alguna (`stats.new > 0`), igual que la cifra "Nuevas" del Dashboard. Con cero, gris.
- **`views/jobs/JobCard.tsx`:** el cuerpo de la oferta (`pre`) llevaba `fontFamily: 'monospace'` y `fontSize: 13` a pelo. Ahora es `Typography variant="mono" component="pre"`, la variante mono del tema (mismo tamaño, familia del tema). Fondo `grey.100` sin cambio. Deja de ser la excepción que DESIGN.md documentaba.
- **`views/jobs/JobList.tsx`:** sin cambios. Revisado contra DESIGN.md: vacío en `body1` gris centrado con `py` 4, spinner centrado, rejilla de tarjetas con 16px y paginación. Ya cumple.

### Funciones
Sin funciones nuevas. Lógica (`apply.ts`, `inbox.ts`, hooks, datos y endpoints) sin tocar.

### Verificación
- `cd web && npx tsc --noEmit`: sin errores.
- `cd web && npx eslint src/views/jobs/JobsPage.tsx src/views/jobs/JobList.tsx src/views/jobs/JobCard.tsx`: sin errores.
- `scripts/verificar --base main`: sin fallos mecánicos.
- `cd web && npx vite build`: OK.
- Servido con `npx vite preview --port 47879 --strictPort` (PID propio, parado al cerrar). El 47831 del board no se tocó; el 47877 estaba ocupado por otro proceso y tampoco se tocó.
- `chrome http://localhost:47879/nuevas --dom`: el contador sale "0 ofertas nuevas" en gris; la lista vacía dice "No hay ofertas nuevas. La siguiente búsqueda es a las 9:00 am, 1:00 pm o 6:00 pm (hora de Venezuela)."
- `chrome http://localhost:47879/rechazadas --dom`: 10 tarjetas; las 10 `pre` salen con `MuiTypography-mono` y con el texto de la oferta dentro.

### GAPs
- **Verde con cifra mayor que cero:** no visto en el navegador, porque el tablero tiene 0 nuevas. Comprobado por lectura: es el mismo condicional del Dashboard.
- **`StatsRow`** (las cuatro cifras de la bandeja) no sigue el patrón de overline + `metric`. Está en `views/jobs/`, fuera de los tres ficheros de esta subtarea. Pendiente, como ya se dijo en NOV-164.
- **DESIGN.md**, checklist "Cómo seguir el patrón": sigue diciendo que la `pre` de `JobCard` es la única excepción. Ya no lo es. Fuera de alcance; lo corrige quien mantiene la norma.
- **Interacción no probada** (Copiar para compartir, Copiar correo, Ver más, cambiar estado): `chrome` solo lee.
- **Skill `impeccable`:** no aparece en mi listado de skills, así que no se invocó. El cambio es de tokens y no crea interfaz nueva, así que no se rediseñó nada. No leí la guía del disco.

## Frontend — NOV-168 · Frontend Developer · 2026-11-11

### Qué cambió
- **`views/jobs/StatsRow.tsx`:** las cuatro cifras de la bandeja pasan al patrón de contador de DESIGN.md (Metric tile): etiqueta `overline` gris, cifra `metric` (mono 2rem, en `text.primary`) y pista `caption` gris debajo. Antes eran `subtitle2` + `h5`, la excepción pendiente que la norma documentaba.
  - "Nuevas" pasa a verde solo si es mayor que cero, igual que el Dashboard.
  - Pistas nuevas: "Sin mirar todavía" (Nuevas), "Para postularte" (Guardadas), "Sin las junior" (Total para ti). El copy de las cifras y el comentario sobre "Para ti" no cambian.
  - "Última búsqueda" no es un contador, así que no usa `metric`: la fecha va en `mono` y las publicaciones leídas en `caption`. Sin pasadas, `body1` gris con "Sin búsquedas todavía".
  - Antes: "Última búsqueda" mostraba fecha y lectura en una sola línea `h5`. Ahora son dos líneas (fecha, luego lectura). Mismo dato, distinta jerarquía.
- **`views/jobs/LastRunAlert.tsx`:** sin cambio visual. Quitado el ternario redundante de `urgent` (las dos ramas daban la misma etiqueta) y el import `RunFailure` que quedaba sin uso. El nombre del problema sigue saliendo de `runFailureLabel`, así que la sesión caducada sigue diciendo "Hay que iniciar sesión otra vez".
- **`views/jobs/JobFilters.tsx`:** el checkbox pasa a `size="small"` para igualar la altura del campo de búsqueda (`size="small"`). Resto sin cambio: ya seguía el patrón de Inputs.

### Funciones
- `readText(count: number): string`: plural de "publicación leída" para la pista de la última búsqueda. Devuelve "1 publicación leída" o "N publicaciones leídas".
- `StatsRow` no cambia de props (`stats: Stats`) ni de datos.

### Verificación
- `cd web && npx tsc --noEmit`: sin errores.
- `cd web && npx eslint src/views/jobs/JobFilters.tsx src/views/jobs/StatsRow.tsx src/views/jobs/LastRunAlert.tsx`: sin errores.
- `scripts/verificar --base main`: sin fallos mecánicos (aviso de `tsc` por no estar en la raíz; el tsc se corrió en `web/`).
- `cd web && npx vite build`: OK. Servido con `npx vite preview --port 47891 --strictPort` (PID propio).
- `chrome http://localhost:47891/nuevas --dom`: aparecen "Nuevas", "Guardadas", "Total para ti", "Sin las junior", "Última búsqueda", "publicaciones leídas" y `MuiCheckbox-sizeSmall`. El 47831 del board no se tocó.

### GAPs
- **Verde con cifra mayor que cero:** no visto en el navegador, porque la bandeja tiene 0 nuevas. Es el mismo condicional del Dashboard.
- **LastRunAlert:** no se ve en pantalla con los datos actuales, porque la última pasada no tiene `failure`. Comprobado por lectura del código y por el nombre del problema que sale de `runFailureLabel`.
- **Interacción:** escribir en la búsqueda y marcar el checkbox no se ha probado, porque `chrome` solo lee.
- **Skill `impeccable`:** no aparece en mi listado de skills, así que no se invocó. El cambio es de tokens y de jerarquía de un bloque existente, no interfaz nueva. No leí la guía del disco.
- **Captura visual:** no hay captura de pantalla. La comprobación es del DOM servido y de las clases de MUI, no de píxeles.

## Frontend — NOV-169 · Frontend Developer · 2026-11-11

### Qué cambió
- **`views/dashboard/RunPage.tsx` (detalle de pasada):**
  - La cabecera lleva el piloto de estado (`AppStatusPilot`) en la acción a la derecha: "Correcta", "En curso" o "Falló", con la misma lógica de `runStatus.ts` que la tabla del Dashboard. Antes el estado solo se intuía por el aviso.
  - El aviso de fallo pasa a dos líneas: "Falló la búsqueda" en `body2` 600 y, debajo, el texto crudo del error en `caption` con 80% de opacidad. Antes era solo el texto crudo. No se añade ningún consejo de causa: no hay clasificación de errores en esta pantalla.
  - La lista de ofertas tiene encabezado `h6` "Ofertas de esta búsqueda" con una línea `body2` gris, como el bloque "Búsquedas" del Dashboard. Antes iba sin título.
  - El "Leyó N y no guardó ninguna" y el vacío "Esta búsqueda no guardó ninguna oferta nueva." no cambian.
- **`views/dashboard/RejectedPage.tsx`:** sin cambio. Ya cumple la norma: título, subtítulo que dice qué se ve, migas y un vacío que explica por qué ("El filtro no ha descartado nada todavía.").

### Funciones
- No hay funciones nuevas. `RunPage` sigue recibiendo `id` por la ruta y pide `getRun` y `JobList` con `ALL_VERDICTS` y `runId`, sin cambios de datos ni de consultas.

### Verificación
- `cd web && npx tsc --noEmit`: sin errores.
- `cd web && npx eslint src/views/dashboard/RunPage.tsx src/views/dashboard/RejectedPage.tsx`: sin errores.
- `scripts/verificar --base main`: sin fallos mecánicos. Aviso de `tsc` por no estar en la raíz; el tsc se corrió en `web/`.
- `cd web && npm run build`: OK. El `dist` que sirve el 47831 (PID 78902, del board) ya contiene el bundle nuevo (`index-259QcIgI.js`). No lo toqué.
- Lectura de datos: `GET /api/runs` en el 47831 devuelve la pasada 10 (`status: ok`, 0 aceptadas, 25 descartadas), que es la que sirve para ver el detalle.
- Chrome: `chrome http://127.0.0.1:47831/busquedas/10` y `/rechazadas` no respondieron (timeout de 43 s en cada intento). No se ha podido leer el DOM de ninguna de las dos pantallas. Verificación visual: **pendiente**.

### GAPs
- **Verificación en navegador:** no hecha. `chrome` no respondió. Pasos para el board: abrir `http://127.0.0.1:47831/busquedas/10` y comprobar que la cabecera muestra "Correcta" en verde junto al título de la pasada; que debajo aparece el encabezado "Ofertas de esta búsqueda"; y que la lista muestra las 25 descartadas con su motivo. Después, `http://127.0.0.1:47831/rechazadas`: título "Descartadas por el filtro" y las ofertas listadas.
- **Fallo con consejo:** el aviso de fallo muestra el nombre del problema ("Falló la búsqueda") y el error crudo, pero no un consejo de qué hacer. Falta una clasificación de causas; no la inventé.
- **Pasada con fallo no visible con los datos actuales:** la pasada 10 está en `ok`, así que la rama de error (piloto rojo y aviso) no se ha visto en pantalla. Comprobado por lectura del código.
- **Skill `impeccable`:** no aparece en mi listado de skills, así que no se invocó. Los cambios reusan componentes y tokens existentes (piloto, `h6`, `body2`, `caption`); no crean interfaz nueva. No leí la guía del disco.
- **Interacción:** no probada, porque `chrome` solo lee.
