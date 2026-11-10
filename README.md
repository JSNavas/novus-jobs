# Novus Jobs

Busca trabajo en LinkedIn por ti, tres veces al día, y te avisa solo cuando aparece algo que de verdad encaja.

## Para qué existe

Buscar empleo en LinkedIn es leer el mismo feed una y otra vez para descartar casi todo: artículos técnicos, anuncios de cursos, ofertas atadas a un país donde no vives, vacantes que exigen una tecnología que no manejas. El trabajo real —leer veinte publicaciones para encontrar una— es repetitivo, y lo repetitivo se automatiza.

Novus Jobs lee el feed en tu nombre, aplica tu criterio y te deja en el dashboard **solo lo que podrías aceptar**. Lo que descarta también se guarda, con el motivo, para poder auditarlo: una oferta buena descartada por error es la que nunca sabrías que existió.

### Lo que se quiere lograr

1. **Que no se te escape una oferta buena.** Ante la duda se manda, marcada como «Por confirmar». Un falso positivo cuesta diez segundos de lectura; un falso negativo cuesta un trabajo.
2. **Que no tengas que mirar.** Tres pasadas al día y un correo cuando hay algo. El silencio significa que no había nada, y eso también es información.
3. **Que tu cuenta de LinkedIn siga sana.** Es lo único irremplazable de todo esto. El ritmo que la plataforma ve está limitado por cuatro topes simultáneos y no se sube ni aunque insistas con el botón.
4. **Que iniciar sesión pase una sola vez.** La sesión se guarda y se refresca sola; si caduca, te llega un correo diciendo exactamente qué comando correr.
5. **Que crezca a más plataformas.** LinkedIn es la primera, no la única: añadir una es una clase y una línea en el registro.

### Lo que NO hace

- **No se postula por ti.** Prepara el correo en tu Gmail con el puesto y la plantilla escritos, y lo envías tú después de revisarlo. Una candidatura la manda una persona.
- **No interactúa con LinkedIn.** No comenta, no da «me gusta», no manda mensajes. Solo lee.
- **No decide por ti.** Guardar, descartar o marcar como vista es tuyo; el filtro solo ordena la bandeja.

### De dónde sale

Es una réplica deliberada del patrón de [A.R.T.I.O](../A.R.T.I.O), que lleva meses leyendo ese mismo feed a diario sin que la cuenta se resienta: el ritmo de tres franjas, el scroll del contenedor interno, la lectura del DOM y el navegador único por perfil vienen de ahí. Lo que aquí se añadió —y ARTIO no necesitaba— está explicado en los comentarios del código, caso por caso.

## Estructura

- `server/` — backend: pasadas programadas, reglas de filtrado, avisos y API.
- `web/` — frontend: la bandeja de ofertas.
- `docs/` — la nota de la tarea que originó el proyecto.

## Servidor

```bash
cd server
npm ci
npm run build
npm start                      # http://127.0.0.1:47831 (PORT)
```

### Iniciar sesión (una sola vez por plataforma)

```bash
cd server && npm run login -- linkedin
```

Se abre una ventana real. Inicia sesión con calma —resuelve la verificación si la pide— y **cierra la ventana cuando estés dentro**: ese cierre es lo que guarda la sesión. No hay temporizador ni límite de tiempo.

La sesión vive en `~/.novus-jobs/browser-profiles/`: el perfil de Chromium en `<plataforma>/` y las cookies en `<plataforma>.cookies.json`. **Fuera del repo** a propósito: es lo único aquí que no se puede regenerar, así que no la toca ningún `build`, `npm ci` ni limpieza de `server/data`. Si venías de la versión que la guardaba en `server/data/linkedin-profile/`, el primer arranque la mueve sola.

> **Por qué hay un fichero de cookies y no basta el perfil.** Medido con la cuenta real: LinkedIn entrega `li_at` como cookie **de sesión**, sin fecha de caducidad, así que vive en memoria y muere al cerrar el navegador — Chromium nunca la escribe en el perfil. De ahí el síntoma de "inicio sesión, veo el feed, y la siguiente pasada dice que no hay sesión". Las cookies se copian mientras la ventana está abierta y se reinyectan en cada lectura, y se refrescan tras cada pasada buena porque LinkedIn las rota.
>
> Ese fichero vale lo mismo que tu contraseña: va con permisos `600` y nunca entra en el repo.

No hace falta parar el servidor: el login le pide el perfil por HTTP, el servidor suelta el navegador y pausa las pasadas mientras dura, y las reanuda al cerrar la ventana.

### Cuando una pasada falla

El dashboard lo dice arriba, con qué hacer. Los motivos son cuatro y solo uno te pide algo:

| Motivo | Qué pasó | Qué hacer |
|---|---|---|
| `login_required` | La plataforma pidió entrar | `npm run login -- <plataforma>` |
| `profile_busy` | Otra ventana de Chromium tenía el perfil | Cerrarla y reintentar |
| `layout` | Hay sesión y el feed vino vacío: cambió el DOM | Mirar la captura en `server/data/logs/` |
| `other` | Red, timeout, lo demás | Esperar la franja siguiente |

El botón «Buscar ahora» tiene un suelo de **una hora**, y con `login_required` se niega del todo: insistir contra una pantalla de login no arregla nada y es lo que marca una cuenta.

Variables de entorno (`server/.env`, todas opcionales):

| Variable | Por defecto | Para qué |
|---|---|---|
| `PORT` | `47831` | Puerto de la API y de la UI |
| `SCHEDULE_HOURS` | `9,13,18` | Franjas de pasada, hora de Venezuela (UTC-4) |
| `SCHEDULER_ENABLED` | `true` | `false` apaga las pasadas automáticas |
| `JOB_SOURCES` | `linkedin` | Plataformas activas, separadas por comas |
| `BROWSER_PROFILES_DIR` | `~/.novus-jobs/browser-profiles` | Dónde viven las sesiones del navegador |
| `BROWSER_HEADLESS` | `true` | `false` abre el navegador con ventana en las pasadas (para depurar) |
| `LINKEDIN_FEED_URL` | `https://www.linkedin.com/feed/` | Feed que se lee |
| `RESEND_API_KEY` | — | Avisos por correo. Las tres de correo son necesarias o no se manda nada |
| `MAIL_FROM` | — | Remitente (dominio verificado en Resend) |
| `MAIL_TO` | — | A quién se avisa |
| `DASHBOARD_URL` | `http://127.0.0.1:<PORT>/` | El enlace que lleva el correo |
| `GEMINI_API_KEY` | — | Activa el juez LLM (Google AI Studio, capa gratuita). Sin clave mandan solo las reglas |
| `JUDGE_MODEL` | `gemini-3.5-flash-lite` | Modelo del juez |
| `DATA_DIR` | `server/data` | Base de datos, marca de pasada y logs |

Servicio de macOS (arranca al iniciar sesión y se relanza si cae):

```bash
cd server
npm run service:install        # compila, escribe el plist de launchd y lo arranca
npm run service:restart        # reinicia tras cambiar código y recompilar
npm run service:uninstall
```

Los logs están en `server/data/logs/server.log`.

Pruebas: `cd server && npm test`.

## La bandeja

El menú lateral es la bandeja, una lista por estado y con su contador:

| Lista | Qué hay | Cómo llega |
|---|---|---|
| **Nuevas** | recién encontradas, sin mirar | las pone la búsqueda |
| **Vistas** | leídas, sin decidir | «Marcar como vista» |
| **Guardadas** | te interesan, vas a postularte | «Guardar» |
| **Descartadas** | apartadas | «Descartar» |
| **Todas** | cualquier estado | — |

Nada se borra nunca: descartar es archivar. Las pestañas **Para Ti** y **Extras (Junior)** separan lo que te corresponde de lo junior, que llega aparte por si quieres pasárselo a alguien.

Cada oferta trae lo que se puede hacer con ella: **Redactar en Gmail** (abre tu cuenta con el puesto en el asunto y tu plantilla escrita, para que revises y envíes), ver la publicación o el perfil de quien la puso, y copiarla para compartirla. En las junior no aparece el envío de CV.

Todo se refresca solo cada 15 segundos y las horas van en **hora de Venezuela**, con am/pm.

## El ritmo, que es lo que protege la cuenta

Cuatro topes a la vez, y es deliberado que sean cuatro: lo que LinkedIn mide no es cuántas veces pulsas un botón, sino cuántas veces un navegador carga tu feed y con qué patrón.

| | Límite | Qué patrón evita |
|---|---|---|
| 1 | 1 hora entre búsquedas manuales | insistir |
| 2 | 20 min tras cualquier lectura, incluida la automática | encadenar dos cargas seguidas |
| 3 | 3 búsquedas manuales al día (día de Venezuela) | 14 lecturas diarias cumpliendo el tope horario |
| 4 | techo duro de 8 lecturas al día | una configuración mal puesta o un bucle de reintentos |

Si la sesión se cayó, el botón **se niega del todo**: nada va a cambiar hasta que inicies sesión, y machacar una pantalla de login es justo lo que marca una cuenta.

## Avisos por correo

Vía Resend, con las mismas credenciales que ya usa ARTIO: ni cuenta ni factura nuevas.

Se manda un correo **solo cuando hay ofertas nuevas que encajan**. Un correo de "hoy no hay nada" tres veces al día enseña a no abrirlos, y entonces tampoco se abriría el día que llega la buena. El silencio significa que no había nada.

El correo es el **aviso**, no la oferta: dice cuántas llegaron y una línea de cada una, y lleva al dashboard, que es donde se actúa.

También avisa cuando la búsqueda **se para** (sesión caducada, perfil ocupado, maquetado cambiado), y ese es el correo más importante: una sesión caída no se nota sola, porque el dashboard sigue enseñando lo de ayer mientras pasan los días sin buscar nada. Se manda **una vez por racha**: si la pasada anterior ya falló por lo mismo, no se repite.

## El juez

Las reglas miran letras; el juez mira significado. Es el segundo par de ojos y **solo puede descartar** lo que las reglas dejaron pasar: nunca rescata lo que ellas tumban por un motivo duro (presencial, país restringido, inglés, tecnología que no maneja). Ahí mandan las reglas, y es deliberado.

Lo que atrapa es lo que ninguna expresión regular puede: *"esto es una base de talentos, no una vacante"*. Eso mismo, literal, en la primera pasada con el juez encendido.

Va por **Gemini en la capa gratuita de Google AI Studio**, el mismo proveedor que ya usa ARTIO para esta tarea. Una pasada de 25 publicaciones son ~5.100 tokens y hay 3 pasadas al día: unas 90 llamadas al mes, muy por debajo del límite gratuito. Si el proveedor falla se reintenta una vez y, si vuelve a fallar, mandan las reglas y queda escrito el motivo en el log — un juez que no contesta no puede dejarte sin ofertas.

## Afinar el criterio

Todo lo que define a quién se le buscan ofertas vive en [`server/src/profile/profile.ts`](server/src/profile/profile.ts), en tres listas:

- `stack` — todo lo que sabe. Enriquece el "Coincide con", **no** abre la puerta.
- `core` — al menos una tiene que aparecer, o la oferta no encaja.
- `cannotDo` — si una oferta **exige** alguna, se descarta. Añadir una tecnología es una línea aquí y nada más: el veto se construye a partir de esta lista.

⚠️ `cannotDo` se equivoca en los dos sentidos y uno de ellos es invisible: meter algo que **sí** sabe tira ofertas buenas sin dejar rastro. Pasó con Symfony. Antes de añadir nada, mírese el CV.

El veto no es literal: una tecnología ajena no descarta si es "deseable", si está en una enumeración junto a algo que sí sabe ("Node.js, Python o Go"), si es el legacy del que quieren migrar, o si el anuncio lleva varias vacantes.

## Añadir una plataforma

El proyecto está hecho para ir sumando sitios de empleo sin tocar nada más. Solo `sources/registry.ts` sabe qué plataformas existen: ni el runner, ni el planificador, ni el pipeline, ni la API, ni la UI.

1. `server/src/sources/<nombre>.source.ts` con una clase que cumpla `JobSource`. Si necesita sesión, pide su navegador al pool con `pool.session('<id>')` y declara `profileId` y `loginUrl`; si lee de una API o un RSS, los deja en `null`.
2. Una línea en `DEFINITIONS`, en `sources/registry.ts`.
3. Añadirla a `JOB_SOURCES`.

Para quitarla, sacarla de `JOB_SOURCES`. El código se queda, inofensivo.

Dos reglas que no se negocian, y son las que mantienen las cuentas sanas:

- **Un solo navegador por perfil.** La fuente no lanza Chromium: lo pide al pool (`browser/session.ts`). Así el ritmo que ve cada plataforma no depende de cuántas fuentes haya activas.
- **Las fuentes se recorren en serie.** En paralelo serían N navegadores a la vez y N plataformas viendo actividad simultánea desde la misma máquina. Una fuente que falla no tumba a las demás: cada una se registra con su motivo.
