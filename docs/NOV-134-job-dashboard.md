# NOV-134 — Dashboard de búsqueda de empleo con cron de LinkedIn

**Qué resuelve:** revisa el feed de LinkedIn a horas fijas (réplica del ritmo de ARTIO) y muestra en un dashboard las ofertas que encajan con el perfil, sin tocar la cuenta más de lo que ya toca ARTIO.

## Backend — NOV-135 · Backend Developer · 2026-11-10

Subtarea de bootstrap: no hay código de aplicación todavía.

- Commit inicial en `main` (`chore: initial commit`) con `.gitignore`, `README.md`, `server/.gitkeep` y `web/.gitkeep`.
- Rama `feat/job-dashboard` creada desde `main`, sin fusionar nada.
- Sin endpoints ni funciones públicas.

## Frontend — NOV-137 · Frontend Developer · 2026-11-10

Base: plantilla Modernize v7 `starterkit` (TypeScript) copiada a `web/` y purgada. Se quitan: layouts horizontal y blank, autenticación, sample-page, Customizer, RTL, i18n, tema oscuro, contexto de configuración, cabecera demo (carrito, mensajes, idiomas, notificaciones, perfil) e imágenes sin uso. Queda un solo tema claro y texto en español.

### Pantallas
#### JobsPage (`web/src/views/jobs/JobsPage.tsx`) — ruta `/`
Cabecera «Ofertas de empleo» con botón «Buscar ahora»; contador «N ofertas nuevas»; estadísticas; pestañas «Para ti» (`seniority=regular`) y «Extras (junior)» (`seniority=junior`); filtros; lista de tarjetas. «Buscar ahora» hace `POST /api/runs`: 202 muestra aviso de éxito; 409 muestra el motivo que devuelve el servidor.

Cambio (10-nov, commit `fix: add nueva status action…`): antes, la tarjeta ofrecía tres estados; faltaba «Marcar como nueva». Ahora son cuatro (nueva, vista, guardada, descartada).

### Componentes
#### JobCard (`web/src/views/jobs/JobCard.tsx`)
Una oferta, en el orden de la Rev. 5: publicado por, coincidencia de stack, ubicación, vía de postulación («Postularse» o «Enviar CV», o aviso de responder por LinkedIn), aviso de agregador, «Ver publicación» (`target=_blank`) y texto original colapsado con «ver más». Botones de estado para las cuatro opciones (nueva, vista, guardada, descartada); el estado actual no aparece como botón. Props: `job: Job`, `busy: boolean`, `onStatusChange(status)`.
#### JobFilters (`web/src/views/jobs/JobFilters.tsx`)
Texto libre (`q`), estado y «Solo con vía de postulación» (`hasApply`). Props: `values: FilterValues`, `onChange(next)`.
#### StatsRow (`web/src/views/jobs/StatsRow.tsx`)
Cuatro tarjetas: nuevas, guardadas, total aceptadas y última búsqueda. Props: `stats: Stats`.

### Funciones
- `useDashboardData(query)` — pide lista y estadísticas en paralelo; devuelve `page`, `stats`, `error` y `reload()` para refrescar tras cada acción.
- `listJobs`, `updateJobStatus`, `getStats`, `startRun` (`web/src/api/client.ts`) — un `fetch` por endpoint de la tabla del contrato. Un error HTTP lanza `ApiError` con `status` y el `error` del cuerpo.
- `findEnumValue(values, candidate)` (`web/src/enumValue.ts`) — convierte el valor de un select o pestaña en el enum, sin `as`.
- `formatDateTime(iso)` (`web/src/format.ts`) y `jobStatusLabel`, `jobSeniorityLabel`, `jobLocationLabel` (`web/src/labels.ts`).

### Componentes UI y documentación
`web/src/components/ui/`: `AppDialog`, `AppChip`, `AppAlert`, `AppTabs`, `AppSnackbar`, `BlankCard`, `DashboardCard`, `PageContainer`, `Breadcrumb`. Documentados en `web/docs/ui-components.md` y reglas en `web/docs/ui-rules.md`. Regla ESLint `no-restricted-imports` sobre `Dialog`, `Modal`, `Chip`, `Alert`, `Tabs` y `Snackbar` de `@mui/material`.

## Modelo de datos

_Pendiente. Lo define la subtarea de Backend de la API._

Frontend: `web/src/types.ts` redeclara los enums y las interfaces de la sección «Contratos» del plan (rev. 6). **No es todavía una copia de `server/src/types.ts`**: ese fichero no existe en `feat/job-dashboard-api` (10-nov). Cuando Backend lo publique, hay que compararlo con `web/src/types.ts` y ajustar. Enums: `JobVerdict`, `JobStatus`, `JobSeniority`, `JudgeStatus`, `RunStatus`, `JobLocation`. Interfaces: `Job`, `RunInfo`. Cambio (10-nov): se quitó el enum `RunTrigger`, que no está en el contrato del plan.

## Cómo verificarlo

Desde la raíz del proyecto:

    cd /Users/navas/PROGRAMACION/novus-jobs
    git log --oneline main      # debe mostrar: a085529 chore: initial commit
    git branch                  # debe mostrar: * feat/job-dashboard y main

Frontend (worktree `feat/job-dashboard-ui`):

    cd /Users/navas/PROGRAMACION/novus-jobs/.paperclip/worktrees/feat/job-dashboard-ui/web
    npm install
    npm run dev                 # http://localhost:5173 ; proxy /api -> http://localhost:3000

Sin backend en el puerto 3000 la página carga la cabecera y la lista muestra «Error 500» (el proxy de Vite no encuentra el servidor). Con el backend levantado, la pantalla muestra la lista de ofertas. Comprobación de compilación: `npx tsc --noEmit && npx eslint . && npx vite build` (los tres pasan).

## GAPs y decisiones

- Sin remoto `origin`: el proyecto es local, no hubo `pull`.
- `git user.name`/`user.email` no estaban configurados; el commit inicial se firmó con una identidad pasada por línea de comandos (`Backend Developer`), sin tocar la configuración del repo.
- `.paperclip/` se añadió a `.gitignore` aunque hoy esté vacío, para que no entre por accidente.
- Frontend (NOV-137 · Frontend Developer): la cabecera de esta sección decía NOV-136 y «pendiente»; la subtarea asignada a este agente es NOV-137, y es la que aparece aquí.
- Frontend: el tema claro de la plantilla lleva la paleta de `starterkit`; el chunk de producción pasa de 500 kB (aviso de Vite, no bloquea).
- Frontend: no hay validación en runtime de las respuestas JSON. El cliente confía en el contrato de `types.ts` (`as T` en `api/client.ts`). Si el backend se desvía, la pantalla falla al renderizar, no antes.
- Frontend: «Ver publicación» solo aparece si la oferta trae `url`. La Rev. 5 pide un fallback (primer enlace externo, perfil del autor); eso lo tiene que resolver Backend al rellenar `url`. Hoy, si llega `null`, el botón no se muestra.
- Frontend: las interacciones (pestañas, filtros, cambio de estado, «Buscar ahora») no se han pulsado: la herramienta de Chrome es de solo lectura. Verificado con un mock del contrato (3 ofertas, `/api` servido en el puerto 3000): la pestaña «Para ti» renderiza tarjetas con stack, vía de postulación («Postularse» / «Sin enlace ni correo»), «Ver publicación» solo cuando hay `url`, y el contador «2 ofertas nuevas». `POST /api/runs` devuelve 409 con el motivo en el mock; el aviso en pantalla de ese 409 no se ha visto. Pendiente de prueba manual: pestaña «Extras (junior)», filtros, cambio de estado, «Buscar ahora» y el aviso de 409.
- Frontend: el filtro de texto manda una petición por cada tecla (sin debounce).
- Frontend: `web/package.json` y `package-lock.json` son propios de `web/` (sin workspaces), según la decisión 9 del plan.

---

## Rev. 6 — Sesión de LinkedIn, criterio y bandeja · 2026-11-10

Sesión de arreglos a partir de un síntoma del usuario: *"en ARTIO inicié sesión una sola vez y funciona; aquí se cae"*. Se auditó el proyecto contra `A.R.T.I.O` (`src/realtime/web-reader.service.ts`, `job-watch.service.ts`) y se encontró que el patrón de LECTURA estaba bien portado y lo que faltaba era todo lo que SOSTIENE la sesión.

### La causa raíz de la sesión caída

Medido con la cuenta real: tras iniciar sesión, en el perfil quedaban `bcookie`, `bscookie`, `lidc` y `__cf_bm`, pero **no `li_at`**. LinkedIn la entrega como cookie **de sesión**, sin caducidad: vive en memoria y muere con el navegador, y Chromium hace lo correcto al no escribirla. Ningún perfil persistente lo arregla solo.

**Arreglo:** `browser/session.ts` copia las cookies mientras la ventana está viva (en cada navegación y cada 5 s) y las reinyecta en cada contexto de lectura; se refrescan tras cada pasada buena porque LinkedIn las rota. Fichero `~/.novus-jobs/browser-profiles/<id>.cookies.json`, permisos 600.

### Lo demás que fallaba

| Qué | Por qué | Dónde |
|---|---|---|
| Lock huérfano bloqueaba todo | `isProfileLocked` miraba si el fichero existía; Chromium lo deja atrás al morir mal | `browser/profile-lock.ts` — ahora lee el pid del symlink y pregunta si vive |
| El login no podía arrancar | el servidor retenía el perfil 5 min tras cada pasada | `POST /api/browser/:id/release` + pausa del planificador |
| El login cerraba a los 5 s | adivinaba el final del handshake | ahora espera a que el usuario cierre la ventana |
| «Sesión caída» se confundía con «cambió el DOM» | nadie miraba la URL final | `sources/login-wall.ts` |
| Una sesión caída autorizaba reintentos cada 10 min | el suelo bajaba si la pasada leía 0 posts | `runner.ts` — ver topes abajo |
| El perfil vivía en `server/data/` | dentro del árbol de build | `~/.novus-jobs/browser-profiles/`, con migración automática |

### Criterio de filtrado

- **Unicode matemático** (`𝗦𝗶 𝗾𝘂𝗶𝗲𝗿𝗲𝘀`): medio feed lo usa como negrita y dejaba ciegos a todos los filtros. `filters/normalize.ts` (NFKC) en la fuente.
- **Veto por tecnología derivado del perfil**: había una regex paralela a `profile.cannotDo` y habían divergido — no conocía C++ y sí vetaba Symfony, que el CV dice que maneja. Ahora se construye de la lista.
- **Inglés**: la ventana de ±70 caracteres cruzaba a la viñeta siguiente y leía el «Se valorará» del requisito de al lado. Ahora se corta en la viñeta. Y **A1/A2/básico/lectura no descartan** aunque los marquen como excluyentes: son niveles que el candidato tiene.
- **Ubicación**: `latam` estaba en la misma lista que `100% remoto`, es decir una región tratada como modalidad. Una ciudad nombrada ya no se perdona si el anuncio no afirma que es remoto. Se añadieron «exclusiva para», «residir en», etc., y una regla de etiqueta de sitio + país.
- **Publicaciones fusionadas**: una tarjeta podía traer dos posts. `sources/split-posts.ts`.
- **Motivos honestos**: ofertas en inglés o de otro rubro se descartaban como «no es una oferta». El veredicto acertaba y el motivo mentía, lo que impedía auditar.

### Topes de ritmo

Cuatro a la vez (`runner.ts`): 1 h entre manuales · 20 min tras cualquier lectura · 3 manuales por día venezolano · techo duro de 8 lecturas/día. Una pasada que muere por perfil ocupado no gasta presupuesto. Con `login_required` el botón se niega del todo.

### Avisos por correo

Resend, mismas credenciales que ARTIO, remitente propio `Novus Jobs <novus-jobs@novuscore.tech>`. Solo se manda si hay ofertas nuevas; también avisa cuando la búsqueda se para, una vez por racha.

### Dashboard

Bandeja por estado con ruta y contador propios; pestañas con recuento (un contador que no cuadraba con la lista era un bug reportado); títulos y empresa extraídos del anuncio (`filters/headline.ts`); fechas ancladas a `America/Caracas` con am/pm; horas de búsqueda servidas por `GET /api/schedule` en vez de escritas a mano; candidatura por Gmail (`views/jobs/apply.ts`) con el rol en el asunto y la plantilla del usuario, que él revisa y envía.

### Escalabilidad

`sources/registry.ts` es el único sitio que conoce las plataformas. Añadir una = una clase `JobSource` + una línea. Dos reglas: un solo navegador por perfil (pedido al pool) y fuentes en serie, nunca en paralelo.

### GAPs que quedan

- **El juez LLM está apagado**: sin `ANTHROPIC_API_KEY` mandan solo las reglas.
- **El criterio se afinó con 23 publicaciones de un día.** Cada oferta que no sirva es una regla que falta.
- **El enlace permanente del post** no siempre se consigue. Se intenta primero el `urn:li:activity:` del DOM (cero interacción) y se recurre al menú «⋯». Sin ninguno, la oferta apunta a su enlace externo o al perfil del autor, y el botón lo dice.
- **`npm test` usaba `dist/**/*.test.js` sin comillas**: `sh` lo expandía a un solo nivel y `dist/runner.test.js` nunca se ejecutó. Al arreglarlo aparecieron fallos reales en esos tests (el reloj de las pasadas lo ponía el sistema y no el runner). Corregido; `runs.start()` recibe el instante.
- **Depende de que el Mac esté encendido**: launchd local, no hay servidor remoto.
