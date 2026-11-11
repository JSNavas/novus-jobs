---
name: Novus Jobs
description: Torre de control, tema oscuro y denso para seguir búsquedas de empleo y las ofertas que dejan.
colors:
  ink: "#0A0C0E"
  surface: "#12161A"
  graphite-100: "#101417"
  graphite-200: "#161B1F"
  graphite-300: "#222930"
  divider: "#232A31"
  graphite-400: "#3A444E"
  muted: "#8A96A3"
  text: "#D5DCE3"
  text-strong: "#C9D1D9"
  accent: "#7FB8C4"
  accent-deep: "#5F9AA8"
  ok: "#5BE38F"
  ok-deep: "#3FBF73"
  warning: "#E9A23B"
  warning-deep: "#C7852A"
  failure: "#FF5C5C"
  failure-deep: "#D94646"
typography:
  page-title:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "1.3125rem"
    fontWeight: 600
    lineHeight: "1.6rem"
  body:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.334rem"
  caption:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1.66"
  label:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: "1rem"
    letterSpacing: "0.08em"
  figure:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: "2rem"
    fontWeight: 500
    lineHeight: 1
rounded:
  base: "3px"
spacing:
  unit: "8px"
---

# Design System: Novus Jobs

## Overview

**Creative North Star: "La Torre de control"**

Una pantalla de operaciones: oscura, gris grafito, con los datos en primer plano y poca decoración. El sistema existe para que se vea de un vistazo qué ha hecho el buscador, qué ha encontrado y dónde está cada oferta. No es un panel de marketing ni una app de lectura: es una herramienta de seguimiento que se mira muchas veces al día.

El tono es sobrio y denso. Las cifras van en monoespaciada, las etiquetas en mayúsculas pequeñas, y el color se reserva para decir algo: éxito, aviso o fallo. Lo demás es gris. La profundidad se logra con escalones de gris y líneas finas, no con sombras.

La doctrina viene escrita en el código (`web/src/theme/DefaultColors.tsx`, `web/src/theme/Shadows.tsx`, `web/src/views/dashboard/DashboardPage.tsx`) y este documento la recoge. Cuando algo no esté aquí, mira primero el componente de `components/ui/` que lo resuelve.

**Key Characteristics:**
- Fondo casi negro (`#0A0C0E`) con superficies grafito que suben de nivel.
- Sin sombras: separación por borde de 1px y por el escalón entre superficies.
- Un solo acento frío (cian apagado) y tres colores saturados reservados a estado.
- Cifras y fechas en monoespaciada con números tabulares.
- Denso: tablas `size="small"`, cabecera dense, espaciado de 8px en múltiplos pequeños.
- Solo modo oscuro: la app arranca siempre con `appTheme` (`App.tsx`), no hay conmutador.

## Colors

Paleta de tono frío y muy contenida. Hay dos familias: los grises, que construyen el espacio y la jerarquía, y tres colores de estado. El cian es el único acento.

### Primary
- **Cian apagado** (`#7FB8C4`, primary.main): acento único. Se usa en el foco de teclado (`outline` de 1px con offset 2), en la selección de texto (fondo `#5F9AA8`), en el logotipo `NOVUS·JOBS` de la barra lateral, en los botones `contained` (Guardar y el enlace de candidatura) y en el hover de los `IconButton`. Su fondo tenue (`rgba(127,184,196,0.12)`) es el reposo de todo `Button variant="text"` de color primario, como "Marcar como nueva" o "Descartar" en la tarjeta de oferta.
- **Cian profundo** (`#5F9AA8`, primary.dark): solo fondo de la selección de texto.

### Secondary
- **Gris azulado** (`#8A96A3`, secondary.main): acciones secundarias y el texto de apoyo. Coincide con `text.secondary` y `grey.500`: es el mismo gris que las etiquetas y las pistas.

### Estado
- **Verde** (`#5BE38F`, success.main): solo para una búsqueda correcta y para la cifra "Nuevas" cuando es mayor que cero. Nunca decora.
- **Ámbar** (`#E9A23B`, warning.main): avisos que no son fallo. Pasada parcial, oferta vía agregador, chip "Por confirmar" y el aviso con el motivo del descarte dentro de la tarjeta de oferta.
- **Rojo** (`#FF5C5C`, error.main): solo fallo: búsqueda fallida, sesión caducada, error de carga. Es la única señal que tiñe una fila entera.
- **Info** (`#7FB8C4`): el tema lo iguala al cian del acento. Los `Alert severity="info"` salen en cian.

### Neutral
- **Ink** (`#0A0C0E`, background.default): fondo de página y de la cabecera. Es el suelo.
- **Surface** (`#12161A`, background.paper): tarjetas, tablas, diálogos y popovers. Un escalón por encima del fondo.
- **Graphite 100** (`#101417`, grey.100): fondo de bloques de texto en monoespaciada, como el cuerpo del log de una oferta.
- **Graphite 200** (`#161B1F`, grey.200): pista de las barras de progreso y el trazo de los campos de texto.
- **Graphite 300** (`#222930`, grey.300): el tema lo reserva para la barra de `simplebar`, que hoy no usa ninguna pantalla. La barra de desplazamiento del navegador no está estilizada.
- **Divider** (`#232A31`, divider): todos los bordes: tarjetas, tablas, cabecera, barra lateral y líneas entre filas.
- **Graphite 400** (`#3A444E`, grey.400), **grey.500** (`#8A96A3`) y **grey.600** (`#C9D1D9`): en la paleta, pero ningún componente revisado los usa por nombre. El gris de texto sale de `text.secondary`, que tiene el mismo valor que grey.500.
- **Text primary** (`#D5DCE3`): texto de cuerpo y cifras que hay que leer.

### Named Rules
**The Three Colors Rule.** Solo hay tres colores saturados (verde, ámbar, rojo) y cada uno significa un estado. Un color de estado nunca decora: si no hay estado, es gris.

**The Pilot Not Message Rule.** El color de estado va en un punto de 8px o en un aviso. El mensaje va en texto, para que se lea sin color. Por eso el fallo se escribe también en rojo y en negrita.

## Typography

**Display / Body Font:** `system-ui` con respaldo de `-apple-system`, `Segoe UI`, `Roboto` y `sans-serif`. Sin fuentes externas: la herramienta funciona sin conexión.
**Label / Mono Font:** `ui-monospace`, `SFMono-Regular`, `Menlo`, `monospace`. Se usa para cifras, identificadores, fechas, etiquetas de cabecera y el logotipo.

**Character:** sans de sistema para leer y mono para verificar. Lo que es un dato va en mono, lo que es una frase va en sans.

### Hierarchy
- **Page title** (`h4`, 600, 1.3125rem / 1.6rem): título de cada pantalla, con el subtítulo debajo en `subtitle1` gris.
- **Section title** (`h6`, 600, 1rem): encabezado de bloque, como "Búsquedas", con una línea `body2` gris que explica qué mirar.
- **Card title** (`h5`, 600, 1.125rem): título dentro de una tarjeta. Va con `subtitle2` gris debajo.
- **Body** (`body1`, 400, 0.875rem / 1.334rem): texto corriente, celdas, mensajes vacíos.
- **Body small** (`body2`, 400, 0.75rem / 1rem): texto de apoyo, etiquetas de estado, datos de tarjeta de oferta.
- **Caption** (0.75rem, interlineado por defecto de MUI, 1.66; sin override en el tema): pista debajo de una cifra, y el motivo de fallo truncado en la tabla. No confundir con **Body small**, que es `body2` y sí tiene override (1rem).
- **Overline** (mono, 500, 0.6875rem, mayúsculas, tracking 0.08em): etiquetas de cabecera de tabla y de cifra, y la etiqueta fija "Ofertas de empleo" de la cabecera.
- **Metric** (mono, 500, 2rem, altura 1, cifras tabulares): solo las cifras de los contadores.
- **Mono** (variant `mono`, 400, 0.8125rem, cifras tabulares): fechas de las tablas y el logotipo `NOVUS·JOBS`.

### Named Rules
**The Mono Figures Rule.** Cualquier cifra que se compare, una fecha o un identificador va en mono con números tabulares, para que las columnas se alineen.

## Layout

Modelo de dos columnas fijas: barra lateral a la izquierda y contenido a la derecha.

- **Barra lateral:** 220px, fija desde 1200px de ancho (`lg`). Por debajo se oculta y se abre como cajón desde el botón de menú de la cabecera. Su borde derecho es el divider.
- **Cabecera:** barra pegada arriba, fondo ink, borde inferior divider, altura de barra dense (48px). Contiene solo el botón de menú (móvil) y la etiqueta `OFERTAS DE EMPLEO`.
- **Contenido:** contenedor de ancho máximo `lg` (1200px), con 24px arriba y abajo.
- **Rejilla de cifras:** 1 columna en móvil, 2 desde `sm`, 5 desde `lg` en el dashboard; 4 desde `sm` en el resumen de ofertas.
- **Densidad:** tablas `size="small"` (el padding de celda es el que MUI asigna a ese tamaño), texto de 14px en cuerpo. Es una herramienta de seguimiento: se busca densidad, no aire.

**Espaciado** (unidad de MUI = 8px, sin escala propia):
- Entre bloques de página: `mb` 3 (24px) bajo la cabecera de página; 4 (32px) bajo la rejilla de cifras del dashboard, antes del bloque "Búsquedas".
- Paginación: `py` 2 (16px) alrededor del control de `AppPagination`.
- Dentro de una tarjeta: `p` 2.5 (20px) en las cifras, 3 (24px) en `DashboardCard`.
- Entre tarjetas de una rejilla: `gap` 2 (16px).
- Dentro de una fila o un grupo: `spacing` 1 (8px) entre pilotos y su texto, 2 (16px) entre título y acción de cabecera.
- Vacío centrado: `py` 4 (32px); vacío de tabla: `py` 2 (16px).

## Elevation & Depth

Sin sombras. Está explícito en `theme/Shadows.tsx`: los 25 niveles son `none`. Las tarjetas propias (`BlankCard`, `DashboardCard`) usan `elevation={0}`.

La profundidad sale de dos cosas:
1. **Escalón de superficie:** fondo ink para la página y surface (`#12161A`) para tarjetas, tablas y diálogos.
2. **Borde de 1px** en color divider para tarjetas (`variant="outlined"`), la cabecera, la barra lateral, las líneas de tabla y los popovers.

### Named Rules
**The Flat-By-Default Rule.** Ninguna superficie tiene sombra. Si algo necesita separarse, se hace con borde o con el escalón de gris, nunca con una sombra. El tema además anula la sombra de `Fab` y `ButtonGroup`, que MUI trae por defecto.

## Shapes

Forma casi cuadrada.

- **Radio base:** 3px (`theme.shape.borderRadius`). Lo heredan los botones, los chips y las tarjetas. En `sx` un `borderRadius: 1` equivale a 3px, porque MUI multiplica por el radio base.
- **Excepciones explícitas:** barras de progreso, con 6px; y la clase global `btn-xs` para botones cuadrados de 30px, con 6px.
- **Bordes:** 1px sólidos en divider. Tarjetas dashed solo para datos de auditoría (ver Cards).
- **Clase `btn-xs`:** definida globalmente en `theme/Components.tsx` (botón cuadrado de 30px, radio 6px). Hoy ningún componente la usa; si hace falta un botón cuadrado, usa esa clase en vez de inventar medidas.
- **Sin clipping ni siluetas especiales:** las filas de tabla son rectángulos; la única marca lateral es la franja roja de fallo.

## Components

Cada componente tiene una frase de carácter y luego sus estados. Los componentes compartidos viven en `components/ui/`.

### Page header (`PageContainer`)
- **Carácter:** título sobrio, subtítulo que dice qué se ve.
- **Estructura:** `h4` con subtítulo `subtitle1` gris. Migas de pan opcionales arriba. Una acción opcional a la derecha.
- **Ejemplo:** "Dashboard" con "Qué ha buscado, qué ha encontrado y dónde está cada oferta".

### Metric tile (dashboard)
- **Carácter:** un contador que es también un enlace. Cada cifra se puede abrir.
- **Shape:** `BlankCard` (outlined, sin sombra, sin padding propio). El recuadro interior tiene padding 20px y es el que se pulsa: cambia a `action.hover` al pasar el cursor.
- **Excepción pendiente:** la bandeja (`StatsRow`, en `views/jobs/`) pinta sus cuatro cifras con etiqueta `subtitle2` y cifra `h5`, sin overline ni mono. No sigue este patrón hasta que se unifique; no lo copies.
- **Contenido:** etiqueta `overline` gris, cifra `metric` (2rem mono), pista `caption` gris debajo ("Sin mirar todavía").
- **Color:** la cifra va en `text.primary`. Solo "Nuevas" pasa a verde y únicamente si es mayor que cero.
- **Auditoría:** "Descartadas por el filtro" lleva borde **dashed**. Es el único uso del borde punteado: marca lo que el filtro apartó sin que nadie lo viera. No se usa para pendiente.

### Dashboard card (`DashboardCard`)
- **Estado:** exportada desde `components/ui/`, pero ninguna pantalla la usa hoy.
- **Shape:** card outlined, sin sombra. Su padding efectivo es 39px, no 24px: el `MuiCard` del tema pone 15px en el contenedor y `DashboardCard` añade 24px en `CardContent`. Antes de usarla hay que corregirlo (ver `Components.tsx`); no copies el aire de este bloque.
- **Cabecera:** `h5` con subtítulo `subtitle2` gris a la izquierda; una acción opcional a la derecha, alineada al centro. Margen 16px bajo la cabecera.

### Tables
- **Cabecera:** overline mono en mayúsculas, color gris secundario. Sin fondo.
- **Celdas:** borde inferior divider de 1px; la última fila no lo lleva. Cifras alineadas a la derecha con números tabulares. Fechas en mono.
- **Fila interactiva:** `hover` de MUI y cursor de puntero. Pulsar la fila abre el detalle.
- **Fila de fallo:** fondo `error.light` en toda la fila y una franja izquierda roja de 3px en la primera celda. Es la forma de ver un fallo de un vistazo en una lista larga.
- **Vacío:** una sola fila que ocupa todas las columnas, con una frase centrada en gris (ver Empty states).

### Estado: piloto y etiqueta (`AppStatusPilot`)
- **Carácter:** un punto de luz junto a un texto. El color ilumina, el texto informa.
- **Punto:** 8px, circular, sin borde.
- **Correcta (éxito):** punto verde y texto `text.primary` normal.
- **En curso (neutro):** punto gris y texto normal. Es el estado de una búsqueda que aún corre.
- **Falló (fallo):** punto rojo y texto rojo en negrita (600). Junto al texto, a la derecha, el motivo truncado en `caption` gris con 320px de ancho máximo; el detalle completo está en la pantalla de la búsqueda.
- **Accesibilidad:** si el piloto va sin etiqueta visible, lleva `role="img"` y un nombre accesible (`srLabel`). Un punto sin nombre no existe para un lector de pantalla.

### Chips (`AppChip`)
- **Shape:** `size="small"`, contorno (`variant="outlined"`), radio base.
- **Tonos:** `success`, `warning`, `error`, o `neutral` (gris por defecto). Solo cambian el color del contorno y del texto.
- **Uso:** "Por confirmar" (ámbar), "Descartada por el filtro" (rojo), estado de la oferta (neutro).

### Avisos (`AppAlert`)
- **Shape:** `variant="outlined"`, icono heredado del color del aviso.
- **Severidades:** `error` (rojo), `warning` (ámbar), `info` (cian).
- **Fallo con qué hacer:** el aviso del último fallo (`LastRunAlert`) lleva el nombre del problema en negrita, un guion y el consejo de qué hacer. Debajo, el texto crudo del error en `caption` con 80% de opacidad. Una sesión caducada cambia el nombre a "Hay que iniciar sesión otra vez", pero el color sigue la severidad: rojo si la pasada falló.
- **Pasada parcial:** en ámbar y no en rojo. Hay datos, pero algo hay que arreglar. Es un fallo registrado en una pasada que no quedó en `Error`.
- **Aviso de oferta:** "VÍA AGREGADOR" en ámbar dentro de la tarjeta de oferta, para avisar de que no la publica quien contrata.

### Job card (`JobCard`)
- **Shape:** `BlankCard`, con el título en `h5` y la empresa en `subtitle2` gris debajo.
- **Chips:** a la derecha de la cabecera, uno por dato (por confirmar, descartada por el filtro, estado).
- **Motivo de descarte:** un aviso ámbar que dice "Descartada: " seguido del motivo, para que un criterio mal aplicado se vea y se corrija.
- **Cuerpo:** texto `body2`. El texto de la oferta va en un bloque `pre` con fondo `grey.100`, en monoespaciada de 13px, con altura colapsada y botón para expandir.
- **Acciones de la oferta** (una fila): `contained` para Postularse y Redactar en Gmail, solo si hay candidatura; `outlined` para el enlace a la publicación, "Copiar para compartir" y "Copiar correo". Son acciones de la oferta, no de la bandeja.
- **Acciones de estado** (aparte, en la parte inferior): `contained` para Guardar; `outlined` para Marcar como vista; `text` para Marcar como nueva y Descartar. No se muestra la acción del estado actual.

### Buttons
- **Shape:** radio base, sin sombra, texto sin mayúsculas y peso 400.
- **Contained:** fondo cian (`#7FB8C4`), texto ink. Es la acción de mayor peso; una tarjeta de oferta puede llevar dos (Guardar y candidatura).
- **Outlined:** contorno en color primario; al pasar el cursor se rellena de cian y el texto pasa a ink.
- **Text:** fondo tenue de cian en reposo (`rgba(127,184,196,0.12)`); al pasar el cursor, se rellena de cian. Es la opción de baja jerarquía, pero se nota.
- **Foco:** `outline` de 1px cian con offset de 2px, siempre visible con teclado.

### Inputs
- **Shape:** contorno, radio base. Relleno interior 12px 14px (8px 14px en tamaño pequeño).
- **Trazo:** `grey.200` en reposo; cian en hover y en foco.
- **Error:** el tema no sobrescribe el estado de error del campo, así que MUI lo pinta en `error.main` (rojo) por defecto. El mensaje de error del formulario va en `AppAlert`.

### Navigation (barra lateral)
- **Carácter:** lista sobria de enlaces, con el logotipo en mono cian arriba.
- **Grupos:** dos subtítulos en gris, "Ofertas" y "Auditoría" (esta última para "Descartadas por el filtro").
- **Enlace activo:** fondo `primary.light` (cian al 12%) y texto `primary.main`. Es la única marca de dónde estás; no añadas barra lateral de color.
- **Lugar:** fija a la izquierda desde `lg`; cajón temporal por debajo, que se cierra al navegar.

### Pagination (`AppPagination`)
- **Estructura:** a la izquierda, `body2` gris con el rango y el total ("1-10 de 42 búsquedas"); a la derecha, los controles de página de MUI. El nombre del elemento (`noun`) es el único texto que cambia entre pantallas.
- **Con una sola página no se pinta.** Si el total cabe en `PAGE_SIZE`, el componente devuelve `null`: un control que dice "1" compite con lo que sí se pulsa.

### Pestañas (`AppTabs`)
- **Shape:** `Tabs` de MUI sin override: indicador en cian (`primary`), con 16px de margen inferior. Se usan para filtrar la bandeja por seniority.

### Diálogo (`AppDialog`)
- **Shape:** `Dialog` `fullWidth` de tamaño `sm`, con fondo `surface` y sin sombra (la elevación de MUI está anulada en `Shadows.tsx`).
- **Acciones:** "Cancelar" en `text`; la confirmación en `contained`, solo si se pasa `onConfirm`.

### Aviso flotante (`AppSnackbar`)
- **Shape:** `Alert` `filled` abajo y centrado, 6 segundos. Solo dos tonos: `error` y `success`.
- **Contenido:** conserva el último mensaje mientras se desvanece, para que un error no cambie de color al cerrarse.

### Progress
- **Circular** (`CircularProgress`) centrado con `py` 6 cuando la pantalla carga por primera vez.
- **Lineal:** pista `grey.200`, radio de 6px.

## Empty states

El vacío es un estado legítimo, no un error, y debe decir **por qué** está vacío. Dos situaciones distintas no pueden compartir la misma frase.

- **Lista sin resultados:** una frase en `body1` gris, centrada, con `py` 4. Por ejemplo, "Todavía no se ha buscado ninguna vez." o "Esta búsqueda no guardó ninguna oferta nueva."
- **Tabla sin filas:** una fila única que ocupa todas las columnas, con la frase centrada y `py` 2.
- **Búsqueda que leyó pero no guardó:** un `BlankCard` con un texto explicativo ("Leyó N publicaciones y no guardó ninguna: todas estaban ya vistas en búsquedas anteriores."). No es un fallo: el 0 de abajo no debe parecer roto.
- **Sin datos aún:** un indicador de carga centrado mientras llega la primera respuesta; después, la frase de vacío.
- **Cifra en cero:** sigue en `text.primary`. El verde solo aparece con un valor mayor que cero.

### Named Rules
**The Explain The Empty Rule.** Cada vacío dice por qué. Una pantalla vacía sin explicación parece rota: es la misma queja que motivó el dashboard.

**The Invisible Work Rule.** Lo que el sistema hizo y descartó se muestra y se puede abrir. Un contador que no lleva a sus ofertas obliga a creer lo que dice.

## Do's and Don'ts

### Do:
- **Do** usar el cian para foco, selección, la marca de la barra lateral, los botones de acción y el hover de los iconos. No lo uses para decorar texto.
- **Do** poner el mensaje en texto junto al color de estado, y el fallo también en negrita.
- **Do** usar mono y números tabulares para cifras, fechas e identificadores.
- **Do** usar un borde divider de 1px o un escalón de gris para separar superficies.
- **Do** explicar cada vacío con una frase que diga por qué está vacío.
- **Do** mostrar el motivo del fallo, truncado en la tabla y completo en el aviso.
- **Do** usar el borde dashed solo para datos de auditoría.

### Don't:
- **Don't** añadir sombras, ni siquiera en hover. El `theme/Shadows.tsx` las anula a propósito.
- **Don't** usar verde, ámbar o rojo como decoración: cada uno significa un estado.
- **Don't** usar un color de estado como único indicador: siempre va acompañado de texto.
- **Don't** introducir una fuente externa. La pila es la del sistema y debe funcionar sin conexión.
- **Don't** añadir un modo claro: la app solo tiene el tema oscuro.
- **Don't** usar el borde dashed para indicar pendiente. Es la marca de lo que el filtro apartó.
- **Don't** dejar un vacío sin frase, ni usar la misma frase para dos vacíos distintos.

## Cómo seguir el patrón

Lista corta para quien llega nuevo. Antes de dar una pantalla por buena:

- **Tokens, no colores a pelo.** Ningún `#hex`, `rgb()` ni `rgba()` fuera de `src/theme/`. Usa `primary.main`, `text.secondary`, `error.light`, `divider`, `action.hover`. Compruébalo con `grep -rnE "#[0-9A-Fa-f]{3,6}|rgba?\(" web/src | grep -v src/theme/`: tiene que salir vacío. La pre de la oferta (`JobCard`, 13px y `monospace` genérica) es la única excepción conocida.
- **Tipografía del tema.** Variantes `h4`, `h5`, `h6`, `body1`, `body2`, `overline`, `metric`, `mono`. Nada de `fontSize` a pelo.
- **Estados.** Verde, ámbar o rojo solo si significan algo, y siempre con texto al lado. Fallo: `AppStatusPilot` con `tone="error"` o `AppAlert severity="error"`.
- **Vacíos.** Una frase en `textSecondary` que diga por qué está vacío. En tabla, una fila única con `colSpan` y `py={2}`; en lista, `py={4}` centrado.
- **Tabla.** `size="small"`, cifras a la derecha, fechas en `mono`, fila pulsable con `hover`. Fallo: fila en `error.light` con franja izquierda de 3px.
- **Tarjeta.** `BlankCard` (contorno, sin sombra, sin padding propio). El aire va dentro, en el hijo. No uses un `Card` suelto.
- **Componentes.** Busca primero en `components/ui/`; crea uno nuevo solo si no existe y en ese caso documéntalo aquí.
- **Sin sombras, sin modo claro.** El borde `divider` y el escalón de gris separan. Un `boxShadow` nuevo se revierte.
- **Verificación.** `cd web && npx tsc --noEmit && npm run lint`, y mira la pantalla servida: que se vea tu texto, no solo un `200`.
