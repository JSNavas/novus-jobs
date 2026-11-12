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

### 1.1b Pruebas que funcionan, para grabarlas · comprobadas el 12 nov 2026

Casos reales, verificados contra las APIs en vivo ese día. Sirven para el GIF,
para las capturas y para el primer comentario del Show HN. Antes de grabar hay
que volver a correrlos: las cifras cambian y una cifra inventada se nota.

**EL PLANO BUENO — «Duolingo» en Integraciones → Añadir fuente.**
Se escribe el nombre de una empresa, nada más, y salen sus dos tableros:

```
Duolingo  →  Greenhouse · 61 vacantes   https://boards-api.greenhouse.io/v1/boards/duolingo/jobs?content=true
             Breezy     ·  3 vacantes   https://duolingo.breezy.hr/json
```

Funciona porque detrás se prueban nueve tableros a la vez. Es el plano que
cuenta la idea entera sin una palabra de explicación: **escribes un nombre y la
empresa queda vigilada**. Ningún agregador puede ofrecer eso, porque vigilar el
tablero de una empresa concreta solo compensa si corre en la máquina de quien
quiere ese trabajo.

Otros que se graban igual de bien:

| Se escribe | Sale |
|---|---|
| `Ramp` | Ashby · 176 vacantes |
| `interfell` | «No hay ningún tablero público a nombre de…» — el no también hay que enseñarlo |
| `https://interfell.simera.io/interfell/jobs` | «la página trae sus vacantes dentro, en JSON» · 25 |
| una URL de API cualquiera | el modelo escribe el mapeo y se ven 3 ofertas antes de guardar |

**El segundo plano: el mapeo escrito por la IA.** Con la API de Greenhouse de
Duolingo, el modelo devolvió el descriptor correcto a la primera —lista, los
seis campos, y `content=true` separado de la URL—. Lo que hay que decir en voz
alta mientras se ve: **la IA escribe el adaptador una vez y se guarda como
datos**; las siguientes diez mil vacantes se leen sin IA y sin coste.

**Lo que NO hay que grabar:** una fuente que pida iniciar sesión, y el atracón
de la primera pasada (500+ ofertas) si el juez se ha quedado sin cuota.

### 1.1c El filtro, auditado oferta por oferta · HECHO (12 nov 2026)

Repasadas las **956 guardadas** una a una, en los dos sentidos: lo que entró y
lo que se descartó. Salieron cuatro fallos que ninguna prueba cubría, todos del
mismo tipo —una señal que parecía fuerte y no lo era— y los cuatro están
arreglados y con prueba de regresión:

| Lo que fallaba | Alcance | Caso que lo delató |
| --- | --- | --- |
| El `Hilo:` que escribe nuestro propio adaptador contaba como «esto es contenido, no oferta» | 169 de 188 de Hacker News | `Hilo: Ask HN: Who is hiring?` |
| `REMOTE (US)` se leía como remoto global | 12 ofertas | `Remote (US Only)`, `Remote (EU time zone)` |
| El veto por una palabra que también es palabra | 23 de 24 vetos por `go` | *«what can go wrong»*, *«go-to-market»* |
| Un candidato presentándose en inglés pasaba por oferta | 2 | *«I'm Sushant Gangurde, A Software Engineer»* |

Y un anuncio híbrido **y** atado a países ajenos se descarta ahora por el país,
que es lo que el juez no puede revocar: Lithic pedía Nueva York presencial y
estar en EE. UU., Canadá, Países Bajos o Polonia, y se colaba.

Esto es material para el lanzamiento, no solo una corrección: **que la auditoría
fuera posible es el argumento**. Ninguna de las cuatro se encuentra leyendo
código; se encontraron porque cada descarte queda guardado con su motivo.
Verificado hasta converger: cero aceptadas que deban caer, cero descartadas que
deban volver. 337 pruebas.

### 1.2 El alta tiene que enseñar que lee el CV · media tarde
El GIF de arriba no existe hasta que el paso 2 del alta lo merezca. Hoy es una
lista fija de casillas: el usuario no ve que la máquina ha leído su currículum,
así que el momento «ah, vale» se pierde justo donde debería ocurrir.

El back ya lo hace — `extractFromCv` devuelve stack, nivel de inglés, país y
vetos sugeridos por ecosistema. Lo que falta es que la pantalla lo cuente:
- Las tecnologías llegan marcadas y etiquetadas como **detectadas en tu CV**.
- El inglés, el país y la ciudad vienen rellenos con lo deducido, y se ve que
  no los escribió el usuario.
- Un bloque aparte de **vetos sugeridos** que se aceptan o se rechazan: si no
  ha tocado Java, se propone vetar el ecosistema Java entero.

Hay que conservar `blockingError`, el guardado por paso (`changesOf`),
`applyReading` y el modo `?editar=1`, que no vuelve a sellar la fecha de alta.

### 1.3 CI con insignia verde · 1 hora
`.github/workflows/ci.yml` que en cada push corra `npm ci`, `tsc --noEmit`,
`npm test` y el build del dashboard, en server y en web. La insignia en el
README dice «237 tests en verde» a quien no va a clonar nada. Sin ella, los
tests son una afirmación.

### 1.4 Tres o cuatro fuentes más · ~~1 día~~ HECHO (12 nov 2026)
Hoy son **siete**, y seis no piden cuenta, así que el proyecto funciona sin
configurar nada. Cuatro no son código sino **descriptores** JSON en
`server/descriptors/` ([docs/DESCRIPTORS.md](docs/DESCRIPTORS.md)).

| Fuente | Cómo | Cómo está hecha |
|---|---|---|
| Remotive | `GET /api/remote-jobs` | descriptor |
| RemoteOK | `GET /api` (array en la raíz, `skip: 1` por su aviso legal) | descriptor |
| Himalayas | `GET /jobs/api` | descriptor |
| We Work Remotely | RSS por categoría | descriptor |
| Hacker News «Who is hiring» | Algolia sobre el hilo del mes | clase: el id cambia cada mes |

Salió mejor de lo planeado: en vez de cuatro clases quedó un motor que convierte
cualquier API JSON o RSS en una fuente, y este repositorio dejó de ser el cuello
de botella para añadir portales.

**Lo que falta de esto, y es lo que más mueve:**
- **La pantalla para añadir una fuente desde Integraciones.** Hoy un descriptor
  es un fichero y un reinicio. Sin pantalla, la promesa «cada usuario añade sus
  APIs» no se cumple para quien no abre una terminal — y es justo el argumento
  que distingue al proyecto de cualquier agregador.
- Inferir el descriptor con el LLM desde una URL pegada, para no pedirle al
  usuario que adivine caminos JSON.
- Exportar e importar descriptores (ya se serializan; falta la puerta).
- Paginación por `offset`: Himalayas trae una sola tanda de 50.
- Remote OK pide enlazar de vuelta en sus términos. Ya está en el README.

### 1.5 Instalar en un comando · medio día
Hoy son cinco pasos y dos `npm ci`. Hace falta una de estas dos, no las dos:
- `npm run setup` en la raíz: instala, compila web y server, crea el `.env` y
  arranca.
- `docker compose up`. El público de *self-hosted* lo espera por defecto, y es
  lo que permite probarlo sin tener Node instalado.

### 1.6 Modo demo · medio día
Un `DEMO=true` que arranque con una base de ejemplo: 200 ofertas anonimizadas,
sus descartes con motivo, el Enfoque lleno. Sirve para la captura, para el GIF
y para que alguien lo pruebe en 30 segundos sin dar su CV. Es lo que más
convierte de esta lista.

---

### 1.7 Una pasada sin juez no puede salir verde · 1 hora
**Incumple la regla 2 del proyecto**, que es la que sostiene todo lo demás:
nada se descarta en silencio.

El 12 nov 2026, con nueve plataformas corriendo cada hora, la capa gratuita de
Gemini (20 peticiones al día) se agotó a media mañana: **502 de las 875 ofertas
del día las decidieron solo las reglas**. El juez degrada como está diseñado y
lo escribe en el log —`[juez] 4 tanda(s) sin veredicto`—, pero el panel enseña
la pasada en verde y la oferta guardada dice `judge_status = skipped`, que no
se ve por ningún lado.

Hace falta que la pasada lo diga: un aviso en el dashboard cuando una pasada se
quedó sin segunda opinión, y que la tarjeta de una oferta no juzgada lo
indique. Mitigado en parte subiendo la tanda del juez de 20 a 60 y bajando el
ritmo de las fuentes a 3 h, pero mitigar no es avisar.

### 1.8 Probar el alta de una fuente de punta a punta · 15 minutos
**La pantalla está terminada** (buscar por nombre, por URL, por navegador, el
modelo escribiendo el mapeo, la muestra, guardar y quitar). Lo único que falta
es verla entera con cuota disponible.
La pantalla de **Integraciones → Añadir fuente** está terminada y probada por
partes, pero el paso del modelo —el que escribe el mapeo— solo se ha visto
funcionar fuera de la pantalla, contra la API de Greenhouse de Duolingo. El día
que se probó dentro, la cuota de Gemini ya estaba agotada.

Queda pegar una API cualquiera con cuota disponible y recorrer el camino
entero: descubrir → el modelo escribe el mapeo → ver las tres ofertas de
muestra → guardar → verla encendida en Integraciones → quitarla.

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
- **«Otro scraper que se romperá en un mes.»** Ya está contestado: seis de las
  siete fuentes no tocan LinkedIn, y cuando una cambie de forma la arregla el
  usuario editando un JSON, sin esperar un release.
- **«Esto ya existe: Singer, Airbyte, RSS-Bridge, yt-dlp.»** Va a salir, y hay
  que conceder la parte cierta: extractores mantenidos por la comunidad no son
  una idea nueva. Lo defendible es lo concreto — nadie lo ha hecho para buscar
  empleo, en local, con un filtro que absorbe mapeos imperfectos. Prometer
  «nadie lo ha hecho» a secas se cae con una búsqueda, y cuesta el hilo.
- **«¿Por qué no es un SaaS?»** Esa es la gracia, y conviene que la primera
  línea del README lo diga aún más fuerte.

---

## 5. Decisiones tuyas que siguen abiertas

- **El repositorio no tiene remoto.** `git remote -v` está vacío y hay 43
  commits del 12 nov sin publicar. Antes del primer `push` hay que decidir las
  dos de abajo, porque el correo del autor queda en el historial para siempre y
  cambiarlo después obliga a reescribirlo.
- La URL del repositorio en el README (`YOUR_USER`).
- Si el commit público va con tu correo personal o con el
  `@users.noreply.github.com` de GitHub.
- Si el perfil de ejemplo (`server/src/profile/profile.ts`) se queda con tus
  listas de tecnología o lo cambiamos por uno inventado. Hoy las pruebas del
  filtro dependen de él.
