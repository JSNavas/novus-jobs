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

### El juez: de Anthropic a Gemini

El proyecto nació pidiendo `ANTHROPIC_API_KEY`, una clave que el usuario no tenía, así que el juez estuvo apagado desde el principio y las reglas quedaron solas — justo lo que el juez existe para evitar. ARTIO juzga estas mismas ofertas con Gemini (`job-judge.service.ts`, `GEMINI_API_KEY`), que el usuario ya usa. Se cambió el proveedor conservando el contrato: `LlmJudge` sustituye a `ClaudeJudge`, `@google/genai` a `@anthropic-ai/sdk`.

El criterio para elegir proveedor no fue cuál es mejor, sino cuál ya está en casa y en capa gratuita.

Dos fallos del juez encontrados al probarlo en real:

- El `catch` se tragaba el error entero y devolvía `null`. La pasada seguía con las reglas —correcto— pero nadie sabía por qué el juez no opinaba. Era un 503 de Google por saturación. Ahora se registra.
- No había reintento. Un 503 pasajero costaba el juicio de la pasada entera. Ahora se reintenta una vez, y solo ante errores transitorios: una respuesta mal formada no mejora repitiendo y gastaría presupuesto.

Modelo por defecto `gemini-3.5-flash-lite` y no el `3.1` de ARTIO, porque el 3.1 llevaba horas devolviendo 503. Configurable con `JUDGE_MODEL`.

Medición real: 25 publicaciones = ~5.100 tokens por pasada; 3 pasadas al día = ~90 llamadas al mes.

### Rev. 6b — La bandeja, afinada

A petición del usuario tras usarla:

- **Fuera «Todas»**: las cuatro listas por estado cubren todo, así que era una quinta entrada que no añadía nada. `/todas` redirige a Nuevas en vez de dar error.
- **Contador solo en Nuevas y Guardadas** (`showsCount` en `views/jobs/inbox.ts`): son las listas sobre las que se actúa.
- **Las junior no cuentan** (`JobsRepository.stats`): el menú decía "2 nuevas" cuando solo una era para él. Siguen apareciendo en su pestaña. El recuadro «Total aceptadas» pasa a «Total para ti», porque llamarlo aceptadas ya sería mentir.

Dos fallos del aviso flotante encontrados al probar el tope diario:

- Cualquier 409 se mostraba con el prefijo "Ya hay una búsqueda en curso", pero ese código cubre todos los rechazos: el tope del día, los minutos que faltan, la sesión caída. El prefijo contradecía al motivo real que venía detrás. El servidor ya dice la verdad; se muestra tal cual.
- `severity` caía por defecto a `'success'` cuando el mensaje pasaba a `null` al cerrar. Un `Snackbar` sigue pintando su contenido mientras se desvanece, así que el aviso **rojo de error se volvía verde al irse**: parecía que, tras decirte que no se podía buscar, algo había salido bien. `AppSnackbar` recuerda ahora lo último que enseñó y lo mantiene durante la salida.

## Rev. 7 — El juez podía descartar, pero no rescatar · 2026-11-11

Entró por una queja: *"ARTIO consigue ofertas diariamente y este no consigue
ninguna, todas descartadas"*. Lo primero fue medir, porque la premisa no se
sostenía.

### Lo que decían los datos

ARTIO, contando el campo `enviada` de `.artio-data/ofertas/*.jsonl` en sus
últimos 14 días con actividad: **838 publicaciones evaluadas, 60 enviadas
(7,2%)**. Entre 1 y 10 al día, media ~4, y **no corre a diario**: huecos de
días enteros (5→9 oct, 10→14→21 oct, 21 oct→9 nov). No existe el ARTIO que
escupe ofertas todos los días.

novus-jobs en esas fechas: 118 evaluadas en 2 días, 1 aceptada. Y las
distribuciones de motivos son casi calcadas:

| Motivo | ARTIO | novus-jobs |
|---|---|---|
| No es una oferta (post técnico/opinión) | 48,5% | 47% |
| Presencial o híbrido fuera de Venezuela | 12,2% | 15,4% |
| Remoto restringido a otro país | 9,1% | 10,3% |
| No menciona nada de su stack | 8,2% | 12,8% |

**Los filtros no estaban rotos.** Se leyeron los descartes uno a uno: un reto
de SQL, un tutorial de Docker sobre PID 1, una demo de un plugin, vacantes
presenciales reales en Albolote, Barcelona y Pakistán, y roles no-dev de
Workremoto (atención a pacientes, diseño gráfico). Ninguno era una oferta que
encajara. Se comprobó además que el clasificador de ubicación no sobre-dispara:
cero publicaciones marcadas `onsite` que hablen de remoto sin mencionar
presencial o híbrido. Y la fuente es **la misma en los dos proyectos**:
`linkedin.com/feed/`.

El cuello de botella es la fuente, no el filtro. Pero sí había un defecto real,
y es el que se arregla aquí.

### El juez solo veía lo que ya había pasado

`judgeAccepted` filtraba `fresh` por `decideShipping(...).accepted`, así que al
modelo solo se le mandaba lo que las reglas **ya habían aceptado**, y
`applyJudgment` salía por `if (!judgment || !rules.accepted) return rules`.

Consecuencia: **un falso descarte de una regex era irrecuperable.** La oferta se
guardaba descartada con `judge_status = skipped` y nadie la volvía a mirar. De
los 117 descartes guardados, **114 nunca pasaron por el juez**.

La decisión original —que el juez solo pudiera vetar— estaba documentada como
deliberada en la Rev. 6 y en el README. Estaba mal.

Ahora `Verdict` lleva `rejectedBy: 'not-offer' | 'location' | 'veto' | 'stack'`
(`filters/decide.ts`), para que el cruce reglas/juez se decida por código y no
casando textos en español. `judgeOffers` manda al juez todo menos los descartes
por `stack`, y `applyJudgment` puede revocarlos. Sobre los mismos 117 descartes:

```
55 not-offer  ┐
30 location   ├─ 100 van al juez (85%)
11 veto       ┘
17 stack      ─── definitivos
```

**El stack no se revoca, y es el único.** Es lo único por lo que no se pregunta
en el prompt. Dejárselo revocar metería «Encargado de atención a pacientes,
remoto» en la bandeja, porque el modelo confirmaría —con razón— que sí es una
vacante remota de verdad. Tampoco se le manda: sería pagar tokens por una
respuesta que se va a ignorar.

Dos cuidados en el rescate:

- Entra marcado como `uncertain` («por confirmar»), no como oferta limpia.
- Si lo revocado fue la **ubicación**, la ubicación baja a `Unknown`. La regla
  que afirmaba «presencial» es justo la que se acaba de caer, así que seguir
  mostrándola sería repetir el error con otra etiqueta. Por eso `toNewJob` ya
  no lee la ubicación de `rules` sino del veredicto final, y el parámetro
  `rules` desaparece de su firma.
- Un descarte de las reglas que el juez confirma **conserva el motivo de la
  regla**, que es más concreto que un `[IA] no es una vacante`. Los textos que
  consume `rejectionCategory` (NOV-172) no cambian.

### Una tanda caída ya no borra las demás

`LlmJudge.judge` devolvía `null` al primer lote fallido: mandaban las reglas y
no se mezclaban criterios a medias. Era defendible cuando el juez solo podía
vetar —perderlo solo dejaba pasar algún falso positivo—. Con rescates, un 503
de Google en la segunda tanda **borraba los rescates de la primera** y la pasada
entera volvía a cero ofertas por un fallo pasajero.

Ahora acumula lo que sí respondió y devuelve `null` solo si no se pudo juzgar
nada. Las ofertas sin veredicto quedan `Skipped`, que es lo que eran todas
antes. El número de tandas caídas se registra en el log.

### Los contadores de cada búsqueda se cuentan, no se recuerdan

Los contadores del historial y la tabla se habían separado:

| Pasada | Reportaba | Guardado |
|---|---|---|
| 6 | 2 acc / 21 rech | **0 filas** |
| 7 | 3 acc / 20 rech | 1 acc / 22 rech |
| 8 | 1 acc / 24 rech | 0 acc / 25 rech |
| 9–11 | coinciden | coinciden |

**No era un bug de código.** Se verificó cruzando `found_at` con la ventana de
cada pasada; el backfill de `run_id` de esta misma tarea es correcto y
conservador (solo toca `run_id IS NULL` y exige que `found_at` caiga dentro de
la ventana), y las filas de la pasada 6 no están en ninguna de las dos bases de
datos del repo. Es daño histórico, y las pasadas posteriores cuadran exactas.

El defecto real es otro: en el dashboard esos números **son pulsables**, y una
cifra apuntada al cerrar la pasada puede separarse de lo que hay detrás. Ahora
`accepted` y `rejected` se cuentan contra `jobs` por `run_id` en un único
`RUN_COLUMNS` que usan `find`, `latest`, `previousTo` y `list`
(`db/runs.repository.ts`). Repara solo el historial torcido: la pasada 6 enseña
0 en vez de prometer 2 que no se pueden abrir.

`fetched` sigue leyéndose de la columna: cuenta publicaciones **leídas**,
duplicadas incluidas, que a propósito no se guardan en `jobs`. No es pulsable.

### Cobertura

13 tests nuevos (137 en total): `pipeline.test.ts` cruza reglas y juez con una
fuente y un juez de mentira contra una base real en `tmp`; `filters/judge.test.ts`
cubre la tanda caída y el desplazamiento de índices entre tandas;
`db/runs.repository.test.ts` fija que el contador guardado se ignora.

### Rev. 7b — Lo que enseñaron las dos primeras pasadas reales

**Pasada 14** (manual, 23 leídas): **22 de 23 descartes pasaron por el juez**.
Con el código anterior habrían sido cero. El único que no se le mandó fue el de
`stack`, exactamente como se diseñó. Gemini confirmó los 22: cero rescates. No
es un fallo del mecanismo —funciona de punta a punta— sino la confirmación de
que esos descartes eran correctos, que es lo que ya decía la comparación con
ARTIO. 18 de las 23 publicaciones ni siquiera eran ofertas.

**Pasada 15** (programada, 23 leídas) destapó dos cosas:

**El `-lite` no contesta.** Las 23 salieron `skipped`:

```
[juez] fallo pasajero (503 "This model is currently experiencing high demand"): reintento en 4s
[juez] no pudo juzgar (503 ...); mandan las reglas
[juez] 1 tanda(s) sin veredicto; esas ofertas las deciden las reglas
```

19 juzgables en una sola tanda, la tanda cayó, cero veredictos. El modelo por
defecto pasa a `gemini-3.5-flash`. El `lite` es el más barato y por eso el más
disputado, y la tarea —clasificar texto corto contra un criterio explícito— no
pide la inteligencia que separa a uno de otro: pide que conteste. Esa última
línea del log es de la Rev. 7; antes el fallo habría sido mudo.

**Las reglas no saben de oficios.** La única «aceptada» de la pasada 15 era un
*Ingeniero de Seguridad de Red* (EE. UU., USD 102-138k) que entró con
`stack_match: ["Python"]`. `judgeCore` acepta en cuanto una tecnología del
núcleo aparece y solo consulta `isOwnRole` cuando el núcleo NO coincide, así que
un puesto que no es el suyo pero menciona Python o JavaScript pasa directo.
ARTIO tiene el mismo hueco.

No se arregla con una regla: exigir `isOwnRole` siempre tiraría los anuncios
cortos que nombran el rol sin listar stack, que es justo para lo que se escribió
ese detector. Un oficio es un juicio de significado, así que se añade `"role"` a
los descartes del juez, con la frontera escrita en el prompt: un puesto de
desarrollo que ADEMÁS pida nociones de seguridad o datos no es `role`; lo es
cuando el trabajo principal no es escribir software. Al ser un motivo por el que
se le pregunta, es revocable como los demás.

### GAPs que quedan
- **El `role` no está probado contra Gemini todavía**, solo con un doble en
  `pipeline.test.ts` sobre el anuncio real que se coló.
- **La señal del feed cronológico es prometedora pero no concluyente.** Tras
  poner «Publicaciones más recientes» en los ajustes de la cuenta, el «no es una
  oferta» cayó del 78% (18/23, pasada 14) al 48% (11/23, pasada 15). Con 23
  publicaciones puede ser ruido.
- **El rescate no ha rescatado nada todavía.** Ya corrió contra Gemini (pasada
  14, Rev. 7b): el juez vio 22 de 23 descartes y confirmó los 22. Sabemos que el
  mecanismo funciona; no sabemos aún su tasa de rescate real, porque hasta ahora
  las reglas no se han equivocado en una pasada observada.
- **Un rescate entra sin enlace al post.** `indicesToFetchPermalink` sigue
  pidiendo el enlace permanente solo de lo que aceptan las reglas, y no puede
  saber el rescate: el permalink se pide durante el `fetch`, antes de juzgar.
  Ampliarlo significa abrir el menú «⋯» en casi todas las publicaciones de cada
  pasada, y la salud de la cuenta manda sobre todo lo demás. De los 100
  descartes rescatables, 36 ya traen `apply_url` o correo extraído del texto.
  Término medio si hiciera falta: pedirlo solo para `location` y `veto` (~30 por
  pasada en vez de ~4), nunca para `not-offer`.
- **El criterio se afinó con 23 publicaciones de un día.** Cada oferta que no sirva es una regla que falta.
- **El enlace permanente del post** no siempre se consigue. Se intenta primero el `urn:li:activity:` del DOM (cero interacción) y se recurre al menú «⋯». Sin ninguno, la oferta apunta a su enlace externo o al perfil del autor, y el botón lo dice.
- **`npm test` usaba `dist/**/*.test.js` sin comillas**: `sh` lo expandía a un solo nivel y `dist/runner.test.js` nunca se ejecutó. Al arreglarlo aparecieron fallos reales en esos tests (el reloj de las pasadas lo ponía el sistema y no el runner). Corregido; `runs.start()` recibe el instante.
- **Depende de que el Mac esté encendido**: launchd local, no hay servidor remoto.

---

## Rev. 8 — Segunda plataforma: Get on Board · 2026-11-11

Primera fuente que no es LinkedIn. Entró sin tocar el pipeline, las reglas, el
juez, la BD ni la UI: una clase en `sources/getonbrd.source.ts`, una línea en
`DEFINITIONS` y su nombre en el valor por defecto de `JOB_SOURCES`.

### Su MCP no servía

Get on Board publica un servidor MCP (`getonbrd.com/mcp`). Es para el lado
contrario del mercado: sus cuatro tools son `whoami`, `search_talent` —busca
candidatos en su base de talento—, `list_jobs` y `job_details`, que listan las
vacantes que publica *tu empresa*. Nada para buscar empleo ni para ver
postulaciones. Descartado tras leer su documentación.

Lo que sí hay es `GET /api/v0/search/jobs`, **200 sin autenticación**. Medido
el 2026-11-11: 187 vacantes remotas en total, dos páginas de 100.

### Lo que esto cambia respecto a LinkedIn

| | LinkedIn | Get on Board |
|---|---|---|
| Cuenta en riesgo | la suya | ninguna |
| Navegador | Chromium con perfil persistente | ninguno |
| Enlace de la oferta | menú «⋯», racionado por salud de cuenta | en la respuesta |
| Ubicación / modalidad | regex sobre el texto del post | `remote`, `remote_modality`, `countries` |
| Sueldo y seniority | si el post los dice | `min_salary`, `max_salary`, `seniority` |

### Medición en seco, las 187 contra las reglas

| | |
|---|---|
| Aceptadas por las reglas | **29 (15,5 %)** |
| Descartadas | 158 |

Los motivos, de mayor a menor: inglés avanzado exigido (41), nada de su stack
(25), Salesforce (9), remoto restringido a otro país (9), WordPress (7), Go (6),
SAP (5). Ninguno sospechoso: son los mismos vetos que ya se validaron contra el
historial de ARTIO.

Para comparar: ARTIO acepta ~7 % y el feed de LinkedIn venía dando 0 de 23.

### El fallo que la medición destapó

Las 29 aceptadas salían **sin vía de postulación**. `extractApplyUrl`
(`filters/offer.ts:49`) reconoce una URL de postulación por su forma —`jobs`,
`career`, `apply`, `postula`, `vacante`, `greenhouse`…— y la que se estaba
poniendo era `/empleos/<slug>`, que no está en esa lista.

Se arregló con el dato correcto y no ensanchando el regex: la URL canónica de
Get on Board es `/jobs/<categoría>/<slug>`, y la respuesta trae el nombre de la
categoría, no su slug, así que la fuente pide `/api/v0/categories` una vez por
pasada para traducirlo. Lleva `/jobs/`, así que el extractor la reconoce sin
tocarlo. Verificado: 29 de 29 con vía de postulación. Si esa petición falla, se
sigue con `/empleos/<slug>`, que redirige con un 301 — se pierde el botón, no la
pasada.

### Decisiones que conviene no reabrir

- **Sin palabra clave.** Se piden todas las remotas y deciden los filtros, igual
  que con el feed. Buscar por términos metería un criterio más estrecho que el
  del resto del proyecto, y ya se midió que el problema nunca fue la falta de
  ofertas.
- **El JSON se convierte a texto.** Suena a paso atrás, pero el pipeline recibe
  `RawPost.text` y de ahí saca todo. Que aceptara campos sueltos significaría
  tocar reglas, juez y BD por una sola fuente.
- **Lo decisivo va primero en el texto.** El juez corta a 1800 caracteres: el
  puesto, la modalidad y los requisitos tienen que caber antes del recorte.
- **Nada volátil en el texto.** La huella que deduplica es un sha1 de los
  primeros 800 caracteres. `applications_count` sube a diario: si se colara, la
  misma vacante entraría como nueva en cada pasada. Hay un test que lo fija.
- **`selectPermalinks` se ignora.** Existe para racionar clics que cuestan salud
  de cuenta. Aquí no hay cuenta ni clics.

### GAPs

- La deduplicación es por fuente (`fingerprintsOf(source)`): una vacante
  publicada en LinkedIn y en Get on Board aparece dos veces.
- Sin integración con la cuenta: `/misempleos` redirige a `/webpros/login`, así
  que saber a cuáles ya se postuló pediría sesión de navegador. No se hizo
  porque no hace falta para encontrar ofertas.
- El tope de 3 páginas se queda corto si Get on Board pasa de 300 remotas.

---

## Rev. 9 — El ritmo deja de ser global · 2026-11-11

Los cuatro topes que protegen la cuenta de LinkedIn vivían como constantes de
módulo en `runner.ts`. Eso los hacía globales por construcción, y con una sola
fuente nadie lo notaba: «el ritmo» y «el ritmo de LinkedIn» eran lo mismo.

Con la segunda fuente dejó de serlo. El mismo día que entró Get on Board, el
presupuesto manual —gastado leyendo LinkedIn— impedía consultar una API pública
que no tiene cuenta, ni sesión, ni nadie midiendo el patrón. Un tope sin nada
que proteger no es prudencia: es una avería.

### Lo que decide el ritmo es qué se arriesga, no la plataforma

`sources/policy.ts` tiene dos políticas, y se llaman por lo que son y no por
quién las usa, para que una fuente nueva elija en vez de escribir otra:

| | `WATCHED_ACCOUNT_POLICY` | `OPEN_API_POLICY` |
|---|---|---|
| Automática | franjas de `SCHEDULE_HOURS` (9, 13, 18 VET) | cada 30 min |
| Entre manuales | 1 hora | 1 minuto |
| Manuales al día | 3 | sin tope |
| Hueco tras cualquier pasada | 20 min | ninguno |
| Techo diario | 8 | ninguno |

### Tres cambios que lo hacen posible

1. **Una fila de `runs` por plataforma.** Antes era una sola con los nombres
   pegados con comas (`linkedin,getonbrd`). Con eso es imposible contarle el
   ritmo a cada una por separado, y además mezclaba en un número los resultados
   de dos sitios. Las pasadas siguen en serie.
2. **Los contadores de ritmo filtran por fuente.** `lastManual`,
   `countTouchingSince` y `lastTouchingAt` reciben el nombre de la plataforma.
3. **El botón pregunta una por una.** `startManual` evalúa cada fuente y lanza
   las que puedan; las que no, van al log. Solo si NINGUNA puede se niega, con
   el motivo de cada una. Antes era todo o nada.

### El planificador, con dos cadencias

- Por franjas: igual que siempre, con marca en disco y recuperación de la
  franja perdida. La marca pasó a ser **una por plataforma** — con una sola,
  dos fuentes en franjas compartirían registro y la segunda se daría por hecha
  sin haber leído nada. El fichero viejo (`{date, hour}` suelto) se sigue
  leyendo como la marca de LinkedIn, para no perder la franja del día al
  desplegar.
- Por intervalo: no lleva marca. Su reloj es la última fila de `runs`, así que
  un reinicio no la descoloca ni la duplica.
- El tick bajó de 10 a 5 minutos: con ticks de 10, un intervalo de 30 oscilaba
  entre 30 y 40 minutos reales. Un tick no toca ninguna plataforma.

### GAP

El techo duro y el presupuesto se cuentan por `source`, así que una fuente
nueva empieza con el contador a cero aunque el día ya vaya cargado. Es lo
correcto mientras las plataformas sean independientes; dejaría de serlo si
alguna vez dos fuentes leyeran de la misma cuenta.

---

## Rev. 10 — La fuente, a la vista · 2026-11-11

Con dos plataformas, de dónde viene una oferta deja de ser un detalle interno:
dice si hay que responderle a un recruiter o rellenar un formulario. Se enseña
en la línea de metadatos de la tarjeta (`Get on Board · Empresa · fecha`) y en
el correo de ofertas nuevas, delante de la ubicación.

`jobSourceLabel` es una función con un mapa y respaldo, no un `Record` sobre un
enum: `Job.source` es el id libre que guarda cada fuente, así que una
plataforma nueva aparece en los datos antes que en la tabla de nombres. Lo
desconocido se enseña tal cual, que dice la verdad, en vez de un hueco.

### El ritmo de LinkedIn, más corto

Decisión del señor, y es suya porque es su cuenta: **de los cuatro topes
manuales queda uno, la hora entre búsquedas**. Se van el presupuesto de 3 al
día y el hueco de 20 minutos tras cualquier lectura. El techo duro sube de 8 a
20, donde ya no estorba (14 manuales + 3 franjas son 17) pero sigue tapando un
bucle de reintentos. La automática no cambia: 9, 13 y 18.

### Detalle cosmético que se deja a propósito

El título de una oferta de Get on Board sale como «BC Tecnología busca:
Developer Full-Stack – LATAM», porque es la primera línea del texto que compone
la fuente. Se podría dejar solo el puesto moviendo la empresa a su propia línea
—el nombre tiene que seguir en el texto para que el juez detecte un empleador
venezolano—, pero eso cambia el texto y con él la huella sha1 que deduplica:
las 187 vacantes volverían a entrar como nuevas una vez, duplicando las 27 que
ya están guardadas y repitiendo el correo. No compensa por un prefijo. `role`
ya sale limpio («Developer Full-Stack»).

---

## Rev. 11 — La motivación de cada postulación, y una sola fila de botones · 2026-11-11

### El «¿por qué te interesa trabajar aquí?»

Get on Board lo pide en cada postulación, entre 50 y 1000 caracteres. Escribirlo
a mano cada vez es lo que hace que se acabe pegando siempre el mismo párrafo
genérico. `motivationLetter(job)` (`web/src/views/jobs/apply.ts`) lo arma con
los datos de ESA oferta, y un botón «Copiar motivación» lo deja en el
portapapeles.

La plantilla es la suya, con dos cambios de fondo que conviene no deshacer:

1. **Empieza por lo que aporta, no por lo que busca.** «Busco una empresa donde
   explotar mi potencial» habla de él; quien lee quiere saber qué recibe. Dice
   lo mismo, en el orden que le sirve.
2. **Nombra la coincidencia real de tecnologías** (hasta cuatro, de
   `stackMatch`). Es la única frase que no se puede escribir de antemano, y por
   eso es la que demuestra que leyó el anuncio.

El nombre del empleador sale de `company`, y si falta de `author` **solo cuando
la fuente es Get on Board**, porque allí la API entrega la empresa. En LinkedIn
`author` es la persona que publicó: «me interesa trabajar en María Pérez» sería
peor que no nombrar a nadie, así que sin nombre la carta abre con «Me interesa
esta oportunidad». Medido sobre ofertas reales: 586–597 caracteres.

No se ofrece en las junior: él no se postula a esas.

### Todos los botones en una fila

Las acciones de bandeja (vista / guardar / descartar) vivían en un bloque
aparte al final de la tarjeta, separadas de las de la oferta. La Rev. 5 lo
justificaba como jerarquía —«mover la oferta por la bandeja es otra cosa»— pero
en uso obligaba a recorrer la tarjeta entera para una acción de un clic. Ahora
van al final de la misma fila, con el peso visual más bajo. Debajo del anuncio
solo queda «Ver más», que es lo único que habla del texto y no de la oferta.

### GAP

`web/` no tiene runner de tests, así que `motivationLetter` se verificó
ejecutando su lógica contra las ofertas reales de la API, no con un test
automático. Si el front llega a tener tests, esta función es la primera
candidata: es pura y tiene cuatro ramas (con/sin rol, con/sin empresa).

---

## Rev. 12 — Configuración: la motivación se edita, no se despliega · 2026-11-11

El párrafo de las postulaciones se corrigió **cinco veces en una tarde**, y
cada corrección fue un cambio de código, un build y un reinicio del servicio.
Una frase que no suena como él no es un error de programación: es algo que
tiene que poder arreglar quien la escribe, en el momento en que la lee.

### Dónde vive ahora

- Tabla `settings (key, value)` en SQLite. Clave y valor, no una columna por
  ajuste: el siguiente no debería pedir una migración.
- En la BD y no en el `.env`, porque el `.env` solo se lee al arrancar —
  cambiar ahí la plantilla obligaría a reiniciar el servicio para corregir una
  coma.
- `GET /api/settings` devuelve la guardada y también la de fábrica, para que la
  pantalla pueda ofrecer «Volver a la de fábrica». `PUT /api/settings` la
  guarda.
- Pantalla `/configuracion`, última del menú y sin contador: se entra una vez a
  dejar una frase como la quieres, no cada día.

### Los huecos

`{puesto}`, `{empresa}` y `{tecnologias}` se rellenan con los datos de cada
oferta; son la diferencia entre un párrafo genérico y uno que demuestra que
leyó el anuncio. Dos comportamientos que no son obvios y están escritos en la
propia pantalla:

- **Sin coincidencias de stack, la frase de `{tecnologias}` desaparece entera.**
  Lo contrario es pegar «requieren conocimientos en las tecnologías , que son
  justo las que vengo usando» en una postulación real.
- **`{empresa}` dice «la empresa» cuando no se sabe quién contrata.** En Get on
  Board la API entrega la empresa; en LinkedIn `author` es la persona que
  publicó, y «me interesa trabajar en María Pérez» sería peor que no nombrar a
  nadie.

### Los largos se validan en el servidor

50 y 1000 caracteres, que son los del formulario de Get on Board. Se validan en
el `PUT` y no solo en la pantalla: descubrir el límite cuando el sitio rechaza
el texto —con la postulación a medias— es el peor momento posible. Un texto
vacío no es un error: significa «vuelve a la de fábrica».

El tope final se vuelve a comprobar al RENDERIZAR, porque los huecos crecen al
rellenarse: una plantilla de 1000 caracteres puede dar una carta de 1080. Si se
pasa, cae la frase de las tecnologías, que es la única prescindible.

### Y «Copiar para compartir» pasó a ser «Copiar enlace»

Copiaba el título, el anuncio entero y la URL. Para pasarle una oferta a
alguien por WhatsApp eso son cuarenta líneas de requisitos que ya están en la
página a la que lleva el enlace: quien lo recibe no las lee y quien lo pega
tiene que borrarlas. Ahora copia el enlace; si la oferta no tiene, el de
postulación; y solo si no hay ninguno, el texto.

### GAP

La plantilla admite cualquier texto, así que puede guardarse una sin huecos
—válida, pero el párrafo sería el mismo en todas las ofertas— o con un hueco
mal escrito (`{empresas}`), que se pegaría literal. No se valida a propósito:
la pantalla lista los tres huecos y el señor es quien escribe ahí. Si llegara a
pasar, el sitio donde avisarlo es la propia pantalla, con una vista previa.

---

## Rev. 13 — La fecha de ellos, y la competencia · 2026-11-11

La tarjeta enseñaba la fecha en que NOSOTROS encontramos la oferta. Con una
pasada cada media hora eso siempre dice «hace un rato»: no informa de nada. La
que sirve es la de la plataforma — una vacante del 2 de noviembre con 298
postulaciones dice algo muy concreto, que llegas tarde.

Se añaden tres datos que Get on Board publica y que deciden si vale la pena
escribir: **cuándo se publicó**, **cuántas postulaciones lleva** y **cuánto
tarda esa empresa en responder**.

### Por qué NO van en el texto del anuncio

`applications_count` sube cada día. La huella que deduplica es un sha1 de los
primeros 800 caracteres del texto, así que meterlo ahí haría que las 187
vacantes volvieran a entrar como nuevas **en cada pasada**. Van en columnas
propias (`posted_at`, `applications`, `response_days_min/max`) y viajan en
`RawPost.metrics`, fuera del texto.

Esa misma separación permite lo siguiente, que es la mitad del valor:

### Las ofertas ya guardadas se ponen al día

`runSource` recorre también los posts que YA están en la base y llama a
`refreshMetrics`. Sin eso, una oferta enseñaría para siempre las postulaciones
que tenía el día que se encontró, y «298 postulaciones» de hace una semana es
peor que no decir nada: parece un dato de hoy.

`refreshMetrics` toca solo esas cuatro columnas. El texto, el veredicto y el
estado en la bandeja son de él y de la pasada que la juzgó: una lectura
posterior no tiene por qué pisarlos. Hay un test que lo fija — una oferta
guardada sigue guardada después de refrescarse.

### Lo que no se inventa

Una fuente que no publica estos datos los deja en `null`, y la tarjeta no
enseña esa línea. Un `0` diría «no se ha postulado nadie», que es una
afirmación, no un hueco. LinkedIn no los da sin abrir cada publicación, así que
ahí la tarjeta sigue diciendo «encontrada el …», nombrándolo, en vez de hacer
pasar nuestra fecha de lectura por fecha de publicación.

### GAP

Los números son de la última lectura, no de este instante: entre pasadas
envejecen hasta media hora. No se dice en la tarjeta. Si llegara a importar, lo
honesto sería escribir «298 postulaciones (hace 20 min)» y no refrescar más a
menudo, que solo sería más tráfico contra su API.

---

## Rev. 14 — Tope de tres meses y orden por fecha de publicación · 2026-11-11

Con las fechas ya a la vista (Rev. 13), lo que enseñaban era malo: de 27
aceptadas, **14 llevaban más de dos meses publicadas**, y la primera de la
lista era del 14 de noviembre de 2025 con 969 postulaciones. Escribirle a eso
es tirar el tiempo, y peor: entierra la vacante de ayer entre veinte de hace
medio año.

### El corte

**90 días.** Va en `pipeline.ts` y no en `decide.ts`, y DESPUÉS del juez. Las
dos cosas son deliberadas:

- **Aparte de las reglas**, porque `decideShipping` solo ve el texto del
  anuncio y la fecha no está ahí: viaja en `RawPost.metrics`.
- **Después del juez**, porque el juez puede rescatar un descarte por ubicación
  o por tecnología —son lecturas, y él lee mejor— pero no puede opinar sobre
  una fecha. Una vacante de hace ocho meses lo es por mucho que encaje. Hay un
  test que lo fija: con el juez diciendo que sirve, sigue descartada.

Lo viejo tampoco se le manda al juez: son tokens gastados en una respuesta que
se va a ignorar.

Una oferta **sin** fecha no se descarta. LinkedIn no la publica, y tirar todo
lo que no la trae apagaría esa fuente entera.

### El orden

`ORDER BY COALESCE(posted_at, found_at) DESC`. Ordenar por `found_at` mezclaba
una vacante de hace ocho meses con una de ayer, porque las dos se leyeron en la
misma pasada. El `COALESCE` deja que LinkedIn se ordene por la lectura, que
ahí es la mejor aproximación que hay.

### Lo ya guardado

Se reclasificaron **9 ofertas** que estaban aceptadas y pasaban de los 90 días.
Se tocaron solo las que estaban en `new` y `seen`.

**Las 3 en `saved` se dejaron como estaban**, aunque sean de enero y noviembre
del año pasado: guardarlas fue una decisión suya, y una regla nueva no deshace
lo que alguien decidió a mano. Si las quiere fuera, las saca él.

### Respuestas a lo que preguntó, con los datos delante

- **«¿Por qué unas salen Por confirmar?»** Es `isUncertain`: las reglas la
  descartaron y el juez las rescató. Se marcan para que las mire dos veces, en
  vez de colarlas como si nadie hubiera dudado.
- **«¿BC Tecnología tiene tantas duplicadas?»** No hay duplicados: 55 ofertas,
  53 títulos distintos y 55 huellas distintas. Es una consultora que publica
  decenas de vacantes.
- **«Esas deberían salir y no salen.»** De las cuatro de su captura, una **sí
  está** (Back-end NestJS de WiTi, aceptada). Las otras tres las descartaron
  sus propios vetos: dos exigen C# y la otra Shopify.

---

## Rev. 15 — Enfoque: qué estudiar, según lo que piden las vacantes · 2026-11-11

Idea suya, y buena: si dos o tres vacantes piden lo mismo, eso es lo relevante
y ahí hay que poner el esfuerzo. Pantalla `/enfoque`, endpoint `GET /api/focus`.

### Por qué un catálogo escrito a mano y no contar palabras

La frase que él señaló —«Experiencia aplicando tipado estricto, concurrencia y
patrones asincrónicos»— **no se repite literal en ninguna otra vacante**. Cada
empresa la escribe a su manera. Lo que se repite es el CONCEPTO, y un concepto
no se detecta contando palabras: «experiencia», «conocimiento» y «sólidos»
saldrían los primeros y no dirían nada.

Así que `analysis/topics.ts` tiene ~60 temas con sus sinónimos, y se cuentan
con `matchStack`, el mismo buscador con fronteras de palabra que ya usa el
filtro. Es trabajo manual y se queda corto en lo que no esté en la lista, pero
lo que devuelve es cierto — y una lista de estudio con ruido no se usa dos
veces.

**El catálogo va más allá de su stack a propósito.** Lo valioso no es confirmar
que piden Node.js: es ver que cuatro vacantes piden DynamoDB, que no sabe.

### Tres decisiones que sostienen el número

- **Solo lo aceptado.** Las descartadas piden C#, SAP o inglés avanzado:
  contarlas convertiría la lista en «aprende lo que no quieres hacer».
- **Una vez por vacante, no por menciones.** Un anuncio que repite «AWS»
  catorce veces en sus funciones no hace a AWS más demandado: hace a esa
  empresa más repetitiva. Hay un test.
- **Solo las viñetas del anuncio.** La presentación de la empresa y los
  beneficios hablan de otra cosa; sin ese corte, la lista se llena de
  «excelente ambiente laboral». Hay un test.

### UNA sola lista (corrección del mismo día)

Nació partida en «Para estudiar» y «Lo que ya tienes», y la división sobraba.
Lo dijo él y tiene razón: **su stack ya hizo de filtro al decidir qué vacantes
entran**, así que volver a separar por lo que sabe era filtrar dos veces por lo
mismo. Lo que se viene a ver aquí es qué piden los requisitos, lo sepa o no.

El campo `known` se sigue calculando —es barato— pero ya no parte la lista ni
desempata el orden. Que apareciera «Git» en una sección titulada «para
estudiar» era, además, un diagnóstico que el dato no sostenía: `PROFILE.stack`
lista tecnologías, no prácticas.

### Primera medición, sobre 18 vacantes aceptadas

| Tema | Vacantes | |
|---|---|---|
| TypeScript | 11 | 61% |
| AWS | 10 | 56% |
| APIs REST · Node.js | 9 | 50% |
| CI/CD · Docker · Escalabilidad · Git · React · Seguridad | 8 | 44% |
| Microservicios | 7 | 39% |
| Arquitectura orientada a eventos · Observabilidad | 6 | 33% |

43 temas en total con al menos dos vacantes.

La frase que él citó aparece bajo «Programación asíncrona», en 5 vacantes.

### GAP

No se guarda: se calcula al vuelo en cada visita. Con doscientas ofertas tarda
milisegundos, y un cálculo guardado envejece sin avisar. Si algún día la base
crece a miles, esto es lo primero que habrá que cachear.
