# Pendiente

Lo que falta para que esto se vea, se instale y se recomiende. Nota interna:
no se publica en el repositorio público.

Orden por **relación entre lo que cuesta y lo que mueve**, no por gusto. Lo de
arriba son horas y cambia el resultado; lo de abajo son días y solo suma si lo
de arriba ya está hecho.

---

## 1. Antes de publicar (sin esto, publicar es tirar el lanzamiento)

Un repositorio se lanza una vez. El día que aparece en Hacker News o en Reddit
recibe el 90% de las visitas que tendrá en meses, y lo que haya en pantalla ese
día decide si se queda en 40 estrellas o pasa de 1.000.

### 1.1 Capturas y un GIF · media tarde
Es un dashboard y el README no enseña ni un píxel. Hace falta:
- El dashboard con datos reales (ofertas de verdad, no «Lorem»).
- La pantalla de descartadas con sus motivos — es lo que nadie más hace y lo
  que demuestra el argumento entero del proyecto.
- Un GIF de 10–15 s del alta: subir el CV y ver cómo se rellenan el stack y el
  inglés solos. Ese es el momento «ah, vale».
- Imagen de *social preview* (1280×640) para que el enlace no salga desnudo en
  X, Slack o Reddit. Se sube en Settings del repositorio, no en el código.

### 1.2 CI con insignia verde · 1 hora
`.github/workflows/ci.yml` que en cada push corra `npm ci`, `tsc --noEmit`,
`npm test` y el build del dashboard, en server y en web. La insignia en el
README dice «237 tests en verde» a quien no va a clonar nada. Sin ella, los
tests son una afirmación.

### 1.3 Tres o cuatro fuentes más · 1 día
Hoy son dos, y la principal pide la cuenta de LinkedIn — que para un
desconocido es pedir mucho el primer día. Con fuentes de API pública el
proyecto funciona **sin configurar nada**:

| Fuente | Cómo | Por qué esa |
|---|---|---|
| RemoteOK | `GET remoteok.com/api`, JSON plano | la más conocida del nicho |
| Remotive | `GET remotive.com/api/remote-jobs` | buen volumen, categorías limpias |
| We Work Remotely | RSS por categoría | la marca con más tráfico |
| Himalayas | API pública | ofertas con país de contratación explícito |
| Hacker News «Who is hiring» | API de Algolia sobre el hilo mensual | donde está el público que da estrellas |

Cada una es un fichero y una línea (`docs/SOURCES.md`). La tabla de plataformas
soportadas del README ya está esperando.

### 1.4 Instalar en un comando · medio día
Hoy son cinco pasos y dos `npm ci`. Hace falta una de estas dos, no las dos:
- `npm run setup` en la raíz: instala, compila web y server, crea el `.env` y
  arranca.
- `docker compose up`. El público de *self-hosted* lo espera por defecto, y es
  lo que permite probarlo sin tener Node instalado.

### 1.5 Modo demo · medio día
Un `DEMO=true` que arranque con una base de ejemplo: 200 ofertas anonimizadas,
sus descartes con motivo, el Enfoque lleno. Sirve para la captura, para el GIF
y para que alguien lo pruebe en 30 segundos sin dar su CV. Es lo que más
convierte de esta lista.

---

## 2. El lanzamiento (un día, y hay que elegirlo)

Nada de esto lo puedo hacer yo: son cuentas tuyas y mensajes con tu nombre.

- **Hacker News, «Show HN»**, martes a jueves por la mañana en horario de la
  costa este. Título sin adjetivos: *Show HN: Novus Jobs – a job hunt that runs
  on your own machine*. El primer comentario, tuyo, contando por qué lo
  escribiste: el proyecto nació de no querer subir el CV a doce sitios, y esa
  historia es el gancho.
- **Reddit**: r/selfhosted (el que más encaja), r/SideProject, r/opensource,
  r/webdev. Uno por día, no todos a la vez.
- **Lobste.rs** si consigues invitación.
- **Pull request a [awesome-selfhosted](https://github.com/awesome-selfhosted/awesome-selfhosted)**.
  Entrar en esa lista da estrellas durante años, no durante un día. Exige
  licencia libre (ya), documentación (ya) y demo o capturas (1.1).
- **dev.to / Medium**: un artículo técnico, no un anuncio. «Cómo filtré 400
  ofertas de empleo con reglas y un LLM, en local» rinde mucho más que
  «presento mi proyecto».
- **Product Hunt** solo si ya hay web con capturas.

Antes de nada: **topics del repositorio** (`job-search`, `self-hosted`,
`privacy`, `typescript`, `local-first`, `linkedin`, `job-board`) y descripción
de una línea. Es el buscador de GitHub y se rellena en dos minutos.

---

## 3. Para que no se caiga después

- **Releases con versión y changelog.** Un repositorio sin releases parece
  abandonado aunque tenga commits de ayer.
- **Imagen de Docker publicada** en GHCR, construida por el CI.
- **Pruebas del dashboard** (Vitest + Testing Library). El servidor tiene 237;
  el frontend, cero.
- **Portugués de Brasil.** El mecanismo de idiomas ya está; es un fichero de
  diccionario. LATAM es el mercado natural de este proyecto y Brasil es la
  mitad.
- **Etiquetas `good first issue`** en cosas de verdad pequeñas: añadir un país
  a `countries.ts`, una tecnología a `technologies.ts`, una fuente nueva. Es lo
  que convierte una estrella en un colaborador.
- **Responder issues en 24 h las primeras semanas.** Pesa más que cualquier
  funcionalidad.

---

## 4. Lo que puede hundirlo, y cómo se contesta

- **«Esto viola los términos de LinkedIn.»** Va a salir en el primer hilo. La
  respuesta honesta ya está escrita en `docs/PRIVACY.md`: lee lo que tú ya
  puedes leer, con tu sesión, a ritmo humano, y no publica ni escribe nada. Hay
  que decirlo en el README antes de que lo pregunten, no después.
- **«Otro scraper que se romperá en un mes.»** Se contesta con las fuentes de
  API pública (1.3): si LinkedIn se cae, el proyecto sigue sirviendo.
- **«¿Por qué no es un SaaS?»** Esa es la gracia, y conviene que la primera
  línea del README lo diga aún más fuerte.

---

## 5. Decisiones tuyas que siguen abiertas

- La URL del repositorio en el README (`YOUR_USER`).
- Si el commit público va con tu correo personal o con el
  `@users.noreply.github.com` de GitHub.
- Si el perfil de ejemplo (`server/src/profile/profile.ts`) se queda con tus
  listas de tecnología o lo cambiamos por uno inventado. Hoy las pruebas del
  filtro dependen de él.
