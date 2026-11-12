# Novus Jobs

Busca trabajo por ti en los **sitios de empleo públicos** que tú enciendas, te avisa solo cuando aparece algo que de verdad encaja, y te dice qué están pidiendo las vacantes que te sirven. **Todo en tu máquina**: tu CV no se sube a ningún sitio y tus datos viven en un fichero que puedes borrar.

Y si falta un portal, **lo añades tú con un JSON**, sin tocar el código ni esperar a que nadie publique una versión: [cómo se describe una fuente](docs/DESCRIPTORS.md).

> English: [README.md](README.md) · Instalación paso a paso: [docs/INSTALL.md](docs/INSTALL.md)
>
> Esta página es la versión larga, con el porqué de cada decisión. Si solo quieres ponerlo a andar, el README en inglés y la guía de instalación son más directos.

## Para qué existe

Buscar empleo en LinkedIn es leer el mismo feed una y otra vez para descartar casi todo: artículos técnicos, anuncios de cursos, ofertas atadas a un país donde no vives, vacantes que exigen una tecnología que no manejas. El trabajo real —leer veinte publicaciones para encontrar una— es repetitivo, y lo repetitivo se automatiza.

Novus Jobs lee el feed en tu nombre, aplica tu criterio y te deja en el dashboard **solo lo que podrías aceptar**. Lo que descarta también se guarda, con el motivo, para poder auditarlo: una oferta buena descartada por error es la que nunca sabrías que existió.

### Lo que se quiere lograr

1. **Que no se te escape una oferta buena.** Ante la duda se manda, marcada como «Por confirmar». Un falso positivo cuesta diez segundos de lectura; un falso negativo cuesta un trabajo.
2. **Que no tengas que mirar.** Tres pasadas al día y un correo cuando hay algo. El silencio significa que no había nada, y eso también es información.
3. **Que tu cuenta de LinkedIn siga sana.** Es lo único irremplazable de todo esto. El ritmo que la plataforma ve está limitado por cuatro topes simultáneos y no se sube ni aunque insistas con el botón.
4. **Que iniciar sesión pase una sola vez.** La sesión se guarda y se refresca sola; si caduca, te llega un correo diciendo exactamente qué comando correr.
5. **Que sirva a cualquiera.** Empezó con el perfil de una persona escrito en el código y ya no: al abrirlo la primera vez hay un alta que lee tu CV, te propone tu stack y tus vetos, y guarda tu perfil en tu base de datos. Nada de lo que decide qué oferta te llega está en el código.
6. **Que crezca a más plataformas, y sin mí.** LinkedIn fue la primera, no la única. Hoy son siete, y cinco de ellas no tienen código propio: son **descriptores**, un JSON que dice de dónde se bajan las vacantes y en qué campos vienen. Añadir un portal dejó de ser un commit de este repositorio para ser un fichero que cualquiera escribe, exporta y comparte.
7. **Que te diga dónde poner el esfuerzo.** Si dos o tres vacantes piden lo mismo, eso es lo relevante. El [Enfoque](#enfoque) lo cuenta solo, y lo que empieza a pedirse y nadie clasificó asoma igual.

### Lo que NO hace

- **No se postula por ti.** Prepara el correo en tu Gmail con el puesto y la plantilla escritos, y lo envías tú después de revisarlo. Una candidatura la manda una persona.
- **No interactúa con LinkedIn.** No comenta, no da «me gusta», no manda mensajes. Solo lee.
- **No decide por ti.** Guardar, descartar o marcar como vista es tuyo; el filtro solo ordena la bandeja.

### De dónde sale

Es una réplica deliberada del patrón de un bot anterior del autor, que lleva meses leyendo ese mismo feed a diario sin que la cuenta se resienta: el ritmo de tres franjas, el scroll del contenedor interno, la lectura del DOM y el navegador único por perfil vienen de ahí. Lo que aquí se añadió está fijado con pruebas, caso por caso.

## Lo que este proyecto no negocia

Seis reglas. Son la razón de que el código sea como es, y un cambio que rompa
una de ellas es un cambio que este proyecto no quiere, por cómodo que sea.

1. **Tus datos son tuyos.** El CV, el perfil y las ofertas viven en ficheros de
   tu disco. Lo que sale de la máquina se activa a mano, con tu propia clave, y
   está enumerado en [docs/PRIVACY.md](docs/PRIVACY.md).
2. **Nada se descarta en silencio.** Lo que no encaja se guarda con su motivo y
   se puede auditar. Una regla que tira ofertas buenas es el error más caro de
   todo esto, y es invisible salvo que quede la prueba.
3. **El ritmo protege al otro lado.** Lo que marca el paso es qué se arriesga al
   leer: tu cuenta, o el servidor de alguien. Los topes no son afinado de
   rendimiento y no se suben por comodidad.
4. **Lo que es tuyo se configura en la aplicación, nunca en un fichero.** Vive
   en la base y se aplica en la siguiente búsqueda. Reiniciar un servicio para
   corregir una coma no es aceptable.
5. **Ninguna plataforma es especial.** Las fuentes son implementaciones
   intercambiables tras una interfaz. Borrar la más grande es un fichero y una
   línea. Llevado hasta el final: si ninguna es especial, ninguna tiene por qué
   estar escrita en el código, y por eso la mayoría son datos.
6. **El porqué vive en las pruebas.** El código no lleva comentarios: lo que
   explica una regla que parece equivocada es su prueba, con el nombre del caso
   real que la hizo falta. Un arreglo sin su caso no lo puede verificar nadie
   después.

## Las pantallas

| | Qué es |
|---|---|
| `/` | el dashboard: qué hizo el buscador y qué descartó |
| `/nuevas` · `/vistas` · `/guardadas` · `/descartadas` | la bandeja |
| `/rechazadas` | lo que tumbó el filtro, con el motivo |
| `/enfoque` | qué piden en común las vacantes que te sirven |
| `/configuracion` | lo que puedes cambiar sin tocar código |

## Estructura

- `server/` — backend: pasadas programadas, reglas de filtrado, avisos y API.
- `web/` — frontend: el dashboard y la bandeja de ofertas.
- `docs/` — la nota de la tarea que originó el proyecto.

## Servidor

```bash
cd web && npm ci && npm run build && cd ..   # el dashboard, que sirve el propio servidor
cd server
npm ci
npm run build
cp .env.example .env           # todo lo de dentro es opcional: los valores por defecto funcionan
npm start                      # http://127.0.0.1:47831 (PORT)
```

La primera vez te recibe el **alta**: seis pasos para subir el CV, revisar tu stack, tu inglés, desde dónde buscas y qué plataformas quieres. Hasta terminarla no se lanza ninguna búsqueda — sin perfil, el filtro descartaría todo lo que encontrase y verías un dashboard vacío sin saber por qué.

Para que no se apague al cerrar la terminal, el servicio permanente está en [docs/INSTALL.md](docs/INSTALL.md), con macOS, Linux y Windows.

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
| `SCHEDULE_HOURS` | `9,13,18` | Franjas de pasada por defecto, en la zona horaria de tu perfil |
| `SCHEDULER_ENABLED` | `true` | `false` apaga las pasadas automáticas |
| `JOB_SOURCES` | `linkedin,getonbrd` | Qué plataformas vienen encendidas **el primer arranque**. Después manda el interruptor de Integraciones y esto se ignora |
| `BROWSER_PROFILES_DIR` | `~/.novus-jobs/browser-profiles` | Dónde viven las sesiones del navegador |
| `BROWSER_HEADLESS` | `true` | `false` abre el navegador con ventana en las pasadas (para depurar) |
| `LINKEDIN_FEED_URL` | `https://www.linkedin.com/feed/` | Feed que se lee |
| `RESEND_API_KEY` | — | Avisos por correo. Las tres de correo son necesarias o no se manda nada |
| `MAIL_FROM` | — | Remitente (dominio verificado en Resend) |
| `MAIL_TO` | — | A quién se avisa |
| `DASHBOARD_URL` | `http://127.0.0.1:<PORT>/` | El enlace que lleva el correo |
| `GEMINI_API_KEY` | — | Activa el juez LLM (Google AI Studio, capa gratuita). Sin clave mandan solo las reglas |
| `JUDGE_MODEL` | `gemini-3.5-flash` | Modelo del juez, y el de la lectura opcional del CV |
| `DATA_DIR` | `server/data` | Base de datos, tu CV, marca de pasada y logs |

Lo que decide **qué oferta te llega** no está aquí: vive en la base de datos y se edita en la propia aplicación, sin reiniciar nada. El `.env` solo lleva lo que no puede estar ahí —puertos, rutas y credenciales—, y por eso se lee una sola vez al arrancar.

Servicio de macOS (arranca al iniciar sesión y se relanza si cae):

```bash
cd server
npm run service:install        # compila, escribe el plist de launchd y lo arranca
npm run service:restart        # reinicia tras cambiar código y recompilar
npm run service:uninstall
```

Los logs están en `server/data/logs/server.log`.

Pruebas: `cd server && npm test`.

## El dashboard

Es la página de inicio, y existe porque la aplicación parecía rota cuando funcionaba bien. Con el filtro haciendo su trabajo, la bandeja de «Nuevas» sale vacía casi siempre: la primera pantalla era un cero sin explicación, sin rastro de que detrás había setenta publicaciones leídas y descartadas con su motivo. **El trabajo invisible hay que enseñarlo, porque es la única prueba de que el sistema está vivo cuando no hay nada que enseñar.**

Arriba, cinco contadores: Nuevas, Vistas, Guardadas, Descartadas por ti y **Descartadas por el filtro**. Debajo, el historial de **búsquedas** con lo que leyó cada una, cuántas encajaron, cuántas descartó y si falló, con el motivo.

**Todo es pulsable y lleva a las ofertas que forman el número.** Un contador que no se puede abrir obliga a creérselo, y lo que hay detrás —qué descartó y por qué— es justo lo que hay que poder auditar. Por eso **los contadores de cada búsqueda se cuentan, no se recuerdan**: salen de contar las ofertas guardadas, no de la cifra que la pasada apuntó al terminar. Las dos se habían separado —una búsqueda decía «3 aceptadas» con 1 en la tabla, otra «23 leídas» sin una sola fila que abrir— y un número que al pulsarlo no enseña lo que promete es peor que un número que no se puede pulsar. Lo único que sí se recuerda es cuántas se **leyeron**, que incluye las repetidas y no lleva a ninguna parte. Pulsando una búsqueda se ven sus ofertas, aceptadas y descartadas juntas: separarlas escondería la mitad del trabajo, y el criterio solo se juzga leyendo seguidas la que pasó y la que no.

Para poder volver a una búsqueda, cada oferta guarda de cuál salió (`jobs.run_id`). Lo guardado antes de que existiera esa columna se rellenó deduciendo la búsqueda por la hora: sin eso, el historial enseñaría «28 leídas» y al pulsarlo no habría nada, que es peor que no poder pulsar — parece que las ofertas se perdieron.

### Descartadas por el filtro

La pantalla de auditoría del criterio, fuera del menú de la bandeja porque no es trabajo pendiente. Guardar los descartes no sirve de nada si no hay dónde leerlos: **una oferta buena descartada por error es la que nunca sabrías que existió**, y hasta que existió esta pantalla el motivo estaba en la base de datos y en ningún sitio más. Cada tarjeta lo dice en su cabecera («exigen c#, que no sabe», «remoto restringido a otro país»).

### Paginación

Todas las listas van **de diez en diez, paginadas en el servidor**: cada página es una petición con `limit` y `offset`, y el navegador nunca recibe setenta ofertas para enseñar diez. El total se consulta aparte y no se deduce de lo devuelto, porque con nueve filas en una página de diez no se sabe si hay más detrás y el paginador acabaría mintiendo. Con una sola página el control desaparece: algo que siempre dice «1» y no lleva a ninguna parte es ruido que compite con lo que sí se puede pulsar.

## La bandeja

«Nuevas» vive en `/nuevas`: la raíz es el dashboard. El menú lateral es la bandeja, una lista por estado y con su contador:

| Lista | Qué hay | Cómo llega | ¿Lleva contador? |
|---|---|---|---|
| **Nuevas** | recién encontradas, sin mirar | las pone la búsqueda | sí |
| **Vistas** | leídas, sin decidir | «Marcar como vista» | no |
| **Guardadas** | te interesan, vas a postularte | «Guardar» | sí |
| **Descartadas** | apartadas | «Descartar» | no |

Nada se borra nunca: descartar es archivar.

El contador solo está donde se actúa —cuántas quedan por mirar y cuántas hay que trabajar—. Vistas y Descartadas son el archivo: su número no cambia ninguna decisión, y un contador que nadie usa compite con los que sí importan.

Una sola lista, sin pestañas. Las hubo —«Para ti» y «Extras (junior)»— cuando el proyecto daba por hecho que su usuario era senior; para alguien que empieza, esa división enseñaba dos veces lo mismo. Lo que separa una oferta útil de una que no lo es ya lo decide tu perfil, no una categoría escrita en el código.

Cada tarjeta empieza diciendo **de dónde viene y de cuándo es**: `Get on Board · BC Tecnología · publicada el 2 nov 2026`. La fecha es la de la plataforma, no la de nuestra lectura — con una pasada cada media hora, «hace un rato» no informa de nada, mientras que «2 de noviembre, 298 postulaciones» dice que llegas tarde. Cuando la fuente no publica la fecha (LinkedIn), la tarjeta dice «encontrada el…», nombrándolo, en vez de hacer pasar una cosa por la otra.

Debajo, lo que Get on Board publica y decide si vale la pena escribir: **cuántas postulaciones lleva** y **cuánto tarda esa empresa en responder**. Se refrescan en cada pasada, porque un «298 postulaciones» de hace una semana es peor que no decir nada.

Y en una sola fila, todo lo que se puede hacer con ella:

| Botón | Qué hace |
|---|---|
| **Postularse** | abre la oferta donde se postula uno |
| **Redactar en Gmail** | tu cuenta, con el puesto en el asunto y tu plantilla escrita |
| **Copiar motivación** | el «¿por qué te interesa trabajar aquí?» ya adaptado a esa oferta |
| **Copiar enlace** | el enlace y nada más, para pasárselo a alguien |
| Vista · Guardar · Descartar | moverla por la bandeja |

Debajo del anuncio solo queda «Ver más», que es lo único que habla del texto y no de la oferta.

### La motivación de cada postulación

Get on Board pide un «¿por qué te interesa trabajar aquí?» en cada postulación, entre 50 y 1000 caracteres. Escribirlo a mano cada vez es lo que hace que se acabe pegando siempre el mismo párrafo genérico, y un párrafo genérico se nota.

El botón copia **tu** texto con tres huecos rellenos con los datos de esa oferta: `{puesto}`, `{empresa}` y `{tecnologias}` (hasta cuatro coincidencias reales con tu stack). Esa última frase es la única que no se puede escribir de antemano, y por eso es la que demuestra que leíste el anuncio.

Dos comportamientos que no se ven: si una oferta no coincide con ninguna tecnología, **la frase que lleva `{tecnologias}` se quita entera** en vez de quedarse coja; y `{empresa}` pone «la empresa» cuando no se sabe quién contrata — en LinkedIn el autor es la *persona* que publicó, y «me interesa trabajar en María Pérez» sería peor que no nombrar a nadie.

El texto se edita en **Configuración**, no en el código.

Todo se refresca solo cada 15 segundos y las horas van en **tu zona horaria**, la que elegiste en el alta, con am/pm.

## Enfoque

La respuesta a **«¿qué tengo que saber para competir por las vacantes que me sirven?»**, sacada de lo que dicen los anuncios.

La cadena es lo que la hace distinta de cualquier ranking de tecnologías: **tu stack ya filtró qué vacantes entran**, así que la página no pregunta qué sabes — pregunta qué piden las que te sirven. Por eso es una sola lista y no dos: separar por lo que ya dominas sería filtrar dos veces por lo mismo.

Cada fila es un tema con el número de vacantes que lo piden y, debajo, **las frases reales de los anuncios**. El nombre del tema es solo el índice; lo que informa son las frases — no «estudia Docker», sino qué esperan que sepas de Docker.

Tres reglas sostienen el número:

- **Solo lo aceptado.** Contar las descartadas convertiría esto en «aprende C# e inglés avanzado», o sea lo que no quieres hacer.
- **Una vez por vacante, no por menciones.** Un anuncio que repite «AWS» catorce veces no hace a AWS más demandado: hace a esa empresa más repetitiva.
- **Mínimo dos vacantes.** Con una no hay patrón, hay una empresa.

Una fila por idea: «Arquitectura limpia (hexagonal, DDD, SOLID)» es una y no tres, porque en los anuncios vienen en la misma frase. El detalle se lee abajo.

La **ventana** (3, 6, 12 o 24 meses) se elige en la propia página: no cambia qué se guarda, sino con cuánto pasado se mira lo guardado. Seis por defecto — una ventana corta reacciona rápido pero tiembla, y lo que interesa ver es algo *empezando* a pedirse, con tiempo para reaccionar.

### Lo nuevo se avisa

Un tema aparece el día que dos vacantes coinciden en pedirlo, y hasta ahora no había forma de enterarse sin recordar cómo estaba la lista la última vez — justo lo contrario de para lo que existe la página.

Ahora **el menú lleva el número** de lo que apareció desde que entraste por última vez, y dentro esas filas salen **resaltadas**. El resaltado se apaga **al salir** de la pantalla, no al entrar: apagarlo al entrar sería dibujar el aviso y borrarlo en el mismo instante.

La primera vez no se marca nada: se guarda la lista como punto de partida. Encontrarse los 39 temas resaltados no es un aviso, es un fondo de pantalla — y enseña a ignorar el resaltado justo el día que empieza a significar algo.

### Apareciendo

El catálogo de temas está escrito a mano, y ese era su único agujero: **lo que no está en él no se detecta por mucho que lo pidan**.

Esta sección lo cierra por el otro lado. En vez de contar lo que conocemos, busca **cualquier palabra técnica que se repita en varias vacantes y que el catálogo no tenga**. Sale sola después de cada búsqueda, sin que nadie la haya previsto: si mañana seis vacantes empiezan a pedir Rust, asoma ahí.

Para que no proponga basura hay siete filtros, y el primero es el que de verdad decide: que se repita en dos vacantes o más. Los demás quitan las siglas que ya cuenta el catálogo, los nombres de las empresas, la primera palabra de cada frase (su mayúscula no es un nombre propio), lo que no tiene forma de tecnología, lo que vetaste —el Enfoque dice dónde poner el esfuerzo, y no vas a aprender algo que descartaste— y, el que más limpia, **cualquier palabra que en otro anuncio aparezca en minúscula**.

Ese último se añadió al entrar las fuentes en inglés. El filtro de «primera palabra» miraba solo el principio de la línea, así que en «Apply. Complete a short screener» se caía *Apply* y sobrevivía *Complete*; con anuncios en español apenas se notaba, y con los de fuera la lista eran ocho palabras corrientes de trece. La regla de la minúscula no depende del idioma: *complete*, *once*, *run* o *most* aparecen en minúscula en algún anuncio, y *Microsoft* o *Kafka* no. Cuesta perder alguna tecnología que también es palabra común, y se acepta: el catálogo ya cubre las grandes, y esta sección existe para lo que nadie clasificó.

## Configuración

Lo que se cambia sin tocar código ni reiniciar nada:

| Ajuste | Qué decide |
|---|---|
| **Idioma** | español o inglés: la interfaz, los correos y los motivos de descarte |
| **Tu perfil** | tu stack, tu núcleo, tus vetos, tu inglés, desde dónde buscas y tu zona horaria: lo que decide qué oferta te llega. Se edita en la misma pantalla del alta, desde Configuración |
| **Motivación** | el párrafo que copia cada oferta, con sus huecos |
| **Antigüedad máxima** | cuántos meses puede tener una vacante para entrar (3 por defecto) |
| **Plataformas** | cuáles están encendidas y a qué ritmo va cada una (en Integraciones) |

Viven en la base de datos y no en el `.env` a propósito: el `.env` solo se lee al arrancar, y corregir una coma no puede obligarte a reiniciar el servicio. La antigüedad se lee **en cada pasada**, así que cambiarla surte efecto en la siguiente búsqueda.

> **La antigüedad de Configuración no es la ventana de Enfoque.** La primera decide qué se guarda; la segunda, con cuánto pasado se mira lo ya guardado. Son dos cosas y por eso se cambian en dos sitios.

## El ritmo, que es el de cada plataforma

El ritmo no lo decide el sitio: lo decide **qué se arriesga al leerlo**. Una cuenta vigilada se protege; una API pública solo pide buena educación. Cada fuente trae su política (`sources/policy.ts`) y se le cuenta por separado — con su propia fila en `runs`.

**LinkedIn — una cuenta que te vigila.** Un tope para el botón: **1 hora entre búsquedas manuales**. Con ese suelo no se encadenan dos cargas por insistir, y el peor día posible son ~14 lecturas repartidas, que es un ritmo humano.

Queda además un techo duro de 20 lecturas al día. No es un límite de uso —con el suelo de una hora no se puede llegar— sino la red de seguridad para que un `SCHEDULE_HOURS` mal puesto o un bucle de reintentos no se conviertan en un día de cargas continuas.

Automática en las franjas de `SCHEDULE_HOURS`: 9, 13 y 18 (VET), sin cambios.

**Get on Board — una API abierta.** No hay cuenta, ni sesión, ni nadie midiendo el patrón. Automática **cada 60 minutos** —editable en Integraciones, con un suelo de 5—, y a mano **sin tope diario**, con un suelo de 1 minuto para no ser un mal vecino de su servidor. Son unas 24 peticiones al día a un endpoint de búsqueda.

El botón pregunta plataforma por plataforma y lanza las que puedan. Antes era todo o nada: el presupuesto de LinkedIn, ya gastado, bloqueaba también a Get on Board, que no tiene nada que gastar. Si ninguna puede, dice el motivo de cada una.

Si la sesión de LinkedIn se cayó, el botón **se niega para ella**: nada va a cambiar hasta que inicies sesión, y machacar una pantalla de login es justo lo que marca una cuenta. Las demás plataformas siguen.

## Avisos por correo

Vía Resend. Las tres variables de correo o ninguna: sin ellas no se manda nada y el dashboard es el único canal.

Se manda un correo **solo cuando hay ofertas nuevas que encajan**. Un correo de "hoy no hay nada" tres veces al día enseña a no abrirlos, y entonces tampoco se abriría el día que llega la buena. El silencio significa que no había nada.

El correo es el **aviso**, no la oferta: dice cuántas llegaron y una línea de cada una, y lleva al dashboard, que es donde se actúa.

También avisa cuando la búsqueda **se para** (sesión caducada, perfil ocupado, maquetado cambiado), y ese es el correo más importante: una sesión caída no se nota sola, porque el dashboard sigue enseñando lo de ayer mientras pasan los días sin buscar nada. Se manda **una vez por racha**: si la pasada anterior ya falló por lo mismo, no se repite.

## El juez

Las reglas miran letras; el juez mira significado. Es el segundo par de ojos, y va en los **dos sentidos**: descarta lo que las reglas dejaron pasar y **rescata lo que las reglas tumbaron** por algo que él sabe leer mejor —si es una vacante de verdad, la ubicación, el idioma, la tecnología—.

Lo que atrapa es lo que ninguna expresión regular puede: *"esto es una base de talentos, no una vacante"*. Eso mismo, literal, en la primera pasada con el juez encendido. Y al revés: *"React, Angular o similar"* no es un veto por Angular, pero la regex no sabe leerlo.

El juez juzga además **si el puesto es de su oficio**. Las reglas no saben de oficios: en cuanto una tecnología del núcleo aparece en el anuncio, dejan pasar. Así entró un «Ingeniero de Seguridad de Red» porque mencionaba Python. Eso lo ve el modelo, no una expresión regular.

### Lo que el juez no puede revocar

Tres cosas, y las tres por el mismo motivo: no son opiniones suyas.

- **El stack.** Es el único por el que no se le pregunta. Dejárselo revocar sería
  dejar entrar «Encargado de atención a pacientes, remoto» porque el modelo
  confirma —con razón— que sí, es una vacante remota de verdad.
- **Un país escrito en el anuncio.** Un «Ubicación: Spain» no es una suposición
  de las reglas: está ahí, en el texto. Lo que se adivina —«presencial»,
  «híbrido»— sí se puede revocar, porque ahí la regla sí estaba opinando.
- **Lo que otra regla no llegó a mirar.** Esto es lo que más costó ver.

Lo último merece explicación, porque fue un fallo real y caro. Las reglas se
evalúan en orden y la primera que dispara manda: las demás no llegan a correr.
Una oferta de Berlín que se descartaba por «no es una oferta» nunca pasaba por
la regla de ubicación. Y cuando el juez decía «sí es una oferta», el rescate la
aceptaba sin que nadie mirara desde dónde se trabaja.

El blindaje del stack tenía el mismo agujero: solo protegía si el stack había
sido el motivo **decisivo**. Si saltaba antes un veto, el juez acababa decidiendo
sobre el stack —justo lo que no debe pasar— y entraban anuncios de Java sin una
sola tecnología del candidato.

Medido sobre la pasada del 12 de noviembre de 2026: **30 de 65 aceptadas habían
entrado por ahí**. Ahora un rescate vuelve a comprobar la ubicación y el núcleo
antes de aceptar, y las dos comprobaciones salen de la misma función que usan
las reglas, para que no haya dos verdades sobre qué ubicación vale.

Con una excepción que costó un segundo error: **un puesto que es su oficio entra
aunque no nombre ni una tecnología**. «Senior Backend Engineer» en un anuncio
vago no es una oferta ajena, es una oferta mal escrita, y `judgeCore` ya la
aceptaba marcándola por confirmar. La primera versión de esta comprobación no
conocía esa excepción y descartó 16 ofertas buenas — un falso descarte, el error
que este proyecto considera el más caro, introducido justo al arreglar el
contrario. Lo encontró una auditoría que compara cada veredicto guardado con lo
que las reglas dirían hoy; conviene repetirla cuando se toque el filtro.

Que el juez pudiera **solo** descartar fue la decisión original, y estaba mal: medido sobre el feed real, de 117 descartes 114 no habían pasado nunca por el juez, y solo 17 eran del stack. Los otros 100 se tiraban sin segunda opinión pudiendo tenerla, y un falso descarte de una regex no tenía vuelta: se guardaba con `judge_status = skipped` y nadie lo volvía a mirar.

Un rescate entra marcado como **«por confirmar»**, no como oferta limpia; y si lo revocado fue la ubicación, la ubicación pasa a «no dice desde dónde se puede trabajar», porque la regla que afirmaba «presencial» es justo la que acaba de caerse.

El modelo por defecto es `gemini-3.5-flash`, no el `-lite`: el `lite` es el más barato y por eso el más disputado, y una pasada perdió sus 19 juicios con un `503 high demand` con reintento incluido. Clasificar texto corto no pide más inteligencia; pide que conteste.

Va por **Gemini en la capa gratuita de Google AI Studio**, que es gratis para este volumen. Se le manda casi toda la pasada (todo menos los descartes por stack): unas 2 llamadas por pasada en tandas de 20 publicaciones, con 3 pasadas al día, muy por debajo del límite gratuito. Si una tanda falla se reintenta y, si vuelve a fallar, **las demás tandas se conservan** y esas ofertas las deciden las reglas: antes un 503 pasajero en la segunda tanda borraba los veredictos de la primera y la pasada entera volvía a cero.

## Afinar el criterio

Todo lo que define a quién se le buscan ofertas vive en **tu base de datos**, y se edita en Configuración → «Editar mi perfil». Son tres listas:

- `stack` — todo lo que sabes. Enriquece el «Coincide con», **no** abre la puerta.
- `core` — al menos una tiene que aparecer, o la oferta no encaja.
- `cannotDo` — si una oferta **exige** alguna, se descarta. En la pantalla se marca por ecosistemas enteros (la JVM, .NET, Ruby…), que es como funciona en la práctica.

Vivían en `profile/profile.ts`, editables solo tocando código, cuando el proyecto tenía un único usuario. Ese fichero sigue ahí como **perfil de ejemplo**: es contra el que están escritas las pruebas del filtro, y uno inventado de tres tecnologías no habría encontrado ninguno de los casos reales que hay en `filters/`.

⚠️ `cannotDo` se equivoca en los dos sentidos y uno de ellos es invisible: meter algo que **sí** sabes tira ofertas buenas sin dejar rastro. Pasó con Symfony. Por eso el alta lo **propone** desde tu CV y lo deja editar, en vez de darlo por cerrado, y por eso solo propone vetar un ecosistema que tu CV no menciona ni una vez.

El veto no es literal: una tecnología ajena no descarta si es «deseable», si está en una enumeración junto a algo que sí sabes («Node.js, Python o Go»), si es el legacy del que quieren migrar, o si el anuncio lleva varias vacantes.

### El idioma y la ubicación son tuyos, no del código

El filtro de inglés comparaba contra un B1 escrito dentro de las propias expresiones, y Venezuela estaba repartida por `location.ts` en cuatro listas a mano. Ahora:

- **Inglés.** Se mide el nivel que *exige* el anuncio y se compara con el tuyo. El mismo «inglés B2 excluyente» descarta a quien tiene B1 y no a quien tiene C1. Y solo veta si pediste filtrar por idioma: apagado, lo ves igual, que es útil para medir cuánto te cierra.
- **Ubicación.** Las listas de países, ciudades y monedas salen de `filters/countries.ts` y se derivan del país que elegiste: el tuyo encaja, los demás restringen. Sin país en el perfil no se aplica ninguna regla de país — sin saber desde dónde buscas, descartar una oferta sería tirarla por una suposición.
- **Zona horaria.** Las franjas son horas de *tu* reloj y el presupuesto del día se corta a *tu* medianoche. Estaba fijada a UTC-4 en el código; ahora se elige en el alta, con horario de verano resuelto por `Intl` en vez de un desfase constante que acertaría media parte del año.
- **Modalidad.** Remoto global, remoto en tu país, híbrido y presencial se encienden por separado. El híbrido dejó de ser «presencial» a secas porque son dos decisiones distintas: hay quien acepta ir dos días y no cinco.

## Añadir una plataforma

El proyecto está hecho para ir sumando sitios de empleo sin tocar nada más.
Solo `sources/registry.ts` sabe qué plataformas existen: ni el runner, ni el
planificador, ni el pipeline, ni la API, ni la UI.

**Lo normal es que no haga falta código.** Si el portal responde a un `GET` con
JSON, o publica un RSS, se describe con un fichero en `server/descriptors/`:

```json
{
  "version": 1,
  "name": "remotive",
  "label": "Remotive",
  "request": { "url": "https://remotive.com/api/remote-jobs" },
  "fields": {
    "list": "jobs",
    "title": "title",
    "company": "company_name",
    "description": "description",
    "url": "url"
  }
}
```

Eso es una plataforma entera: aparece en Integraciones con su interruptor y su
ritmo. El formato completo —paginación, `POST` para Workday, feeds RSS, la lista
en la raíz— está en [docs/DESCRIPTORS.md](docs/DESCRIPTORS.md).

**Por qué esto importa más de lo que parece.** Un agregador vive en el servidor
de alguien, así que solo puede leer portales lo bastante grandes como para que
compense mantenerlos, y cuando lo bloquean lo bloquean para todo el mundo a la
vez. Aquí cada petición sale de tu máquina, con tu IP y tu ritmo. Eso hace
posible la cola larga: la bolsa de tu universidad, el endpoint de empleo de un
banco, la página de «Trabaja con nosotros» de la empresa que te interesa. Y como
un descriptor es un fichero, se exporta, se pega en un issue y se comparte.

El filtro ayuda a que esto funcione aunque el mapeo sea imperfecto: la vacante
viaja como **texto**, y las reglas y el juez leen prosa. Con cuatro campos
—título, empresa, descripción y enlace— sale una oferta que el pipeline evalúa
igual que una de LinkedIn.

**Cuándo sí hace falta una clase.** Cuando hay lógica, no datos: una sesión que
mantener, una firma que calcular, o dos peticiones para contestar una pregunta.
Hacker News es el ejemplo: el hilo «Who is hiring» cambia de identificador cada
mes, así que hay que resolverlo antes de leer los comentarios. Un descriptor con
ese id escrito dentro se habría roto el 1 de diciembre sin avisar.

1. `server/src/sources/<nombre>.source.ts` con una clase que cumpla `JobSource`.
   Si necesita sesión, pide su navegador al pool con `pool.session('<id>')` y
   declara `profileId` y `loginUrl`; si lee de una API, los deja en `null`.
2. Una línea en `DEFINITIONS`, en `sources/registry.ts`.

Y ya está, en los dos casos: aparece en Integraciones con el editor de horario
que le toque. Se construyen todas las conocidas aunque estén apagadas
—construir una no abre navegadores ni hace peticiones— porque una fuente que no
se construye no existe para la interfaz, y entonces no habría desde dónde
encenderla.

Para dejar de usarla, el interruptor. Para quitarla del todo, borrar su fichero
(y su línea, si era una clase); nada más la nombra. `JOB_SOURCES` solo decide
cuáles vienen encendidas el primer arranque.

El contrato completo está en [docs/SOURCES.md](docs/SOURCES.md), y el formato de
los descriptores en [docs/DESCRIPTORS.md](docs/DESCRIPTORS.md).

### Plataformas soportadas

Siete, y cuatro de ellas no tienen código propio. Cada una se enciende, se
apaga y se le pone su ritmo desde Integraciones.

| Plataforma | Cómo lee | Cuenta | Cómo está hecha |
|---|---|---|---|
| **LinkedIn** | navegador con tu sesión | la tuya, y es lo irremplazable | clase |
| **Get on Board** | `GET /api/v0/search/jobs` | ninguna | clase |
| **Hacker News** | el hilo «Who is hiring» del mes, vía Algolia | ninguna | clase |
| **Remotive** | `GET /api/remote-jobs` | ninguna | descriptor |
| **Remote OK** | `GET /api` | ninguna | descriptor |
| **Himalayas** | `GET /jobs/api` | ninguna | descriptor |
| **We Work Remotely** | RSS de empleo en programación | ninguna | descriptor |

Las cinco sin cuenta funcionan **el primer día, sin configurar nada**: vienen
encendidas y no piden iniciar sesión en ningún sitio. LinkedIn es la única que
exige algo tuyo, y por eso no es el punto de entrada del proyecto.

Tres cosas que se aprendieron montándolas, y que valen para la siguiente:

- **Remote OK** devuelve el array en la raíz y pone un aviso legal de primer
  elemento (`"skip": 1` en su descriptor). Sus términos piden enlazar de vuelta.
- **We Work Remotely** no tiene campo de empresa: la escribe en el título,
  `Empresa: Puesto`. De ahí `companySeparator`.
- **Hacker News** no es una bolsa de empleo sino un hilo de comentarios, y el
  hilo cambia cada mes. Por eso es la única de las nuevas con clase propia.

Y una advertencia que vale para casi todas: Get on Board **no** dice desde qué país se puede trabajar. `remote_zone` viene siempre `null` y el país de un remoto llega como `["Remote"]`, así que la elegibilidad geográfica sigue estando solo en la prosa del anuncio. Las reglas y el juez hablan igual.

> **Por qué su API y no su MCP.** Get on Board publica un servidor MCP en `getonbrd.com/mcp`, y es la herramienta del **reclutador**: `search_talent` busca candidatos en su base de talento, y `list_jobs` lista las vacantes que publica *tu* empresa. No hay nada para buscar empleo ni para ver postulaciones. Lo que sí sirve es su API pública, que responde 200 sin credenciales.

Dos reglas que no se negocian, y son las que mantienen las cuentas sanas:

- **Un solo navegador por perfil.** La fuente no lanza Chromium: lo pide al pool (`browser/session.ts`). Así el ritmo que ve cada plataforma no depende de cuántas fuentes haya activas.
- **Las fuentes se recorren en serie.** En paralelo serían N navegadores a la vez y N plataformas viendo actividad simultánea desde la misma máquina. Una fuente que falla no tumba a las demás: cada una se registra con su motivo.
