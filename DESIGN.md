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
  accent-veil: "rgba(127,184,196,0.12)"
  hover-veil: "rgba(213,220,227,0.05)"
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
  card-title:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.6rem"
  section-title:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.2rem"
  body:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.334rem"
  body-small:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1rem"
  mono:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.25rem"
    fontFeature: "tabular-nums"
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
    fontFeature: "tabular-nums"
rounded:
  base: "3px"
  progress: "6px"
spacing:
  unit: "8px"
  rail: "64px"
  sidebar: "224px"
  strip: "46px"
  content-max: "1600px"
components:
  button-contained:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "6px 16px"
  button-contained-hover:
    backgroundColor: "{colors.accent-deep}"
    textColor: "{colors.ink}"
  button-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    rounded: "{rounded.base}"
  button-outlined-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
  button-text:
    backgroundColor: "{colors.accent-veil}"
    textColor: "{colors.accent}"
    rounded: "{rounded.base}"
    padding: "5px 15px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.base}"
    padding: "12px 14px"
  input-small:
    padding: "8px 14px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.base}"
    typography: "{typography.body-small}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.base}"
  metric-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.base}"
    padding: "20px"
  metric-tile-hover:
    backgroundColor: "{colors.graphite-300}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.base}"
    padding: "0 12px"
    height: "38px"
  nav-item-active:
    backgroundColor: "{colors.graphite-300}"
    textColor: "{colors.accent}"
  side-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.base}"
    padding: "18px"
---

# Design System: Novus Jobs

## Overview

**Creative North Star: "La Torre de control"**

Una pantalla de operaciones: oscura, gris grafito, con los datos en primer plano y poca decoración. El sistema existe para que se vea de un vistazo qué ha hecho el buscador, qué ha encontrado y dónde está cada oferta. No es un panel de marketing ni una app de lectura: es una herramienta de seguimiento que se mira muchas veces al día, y la pregunta que tiene que contestar en dos segundos es siempre la misma — *¿funcionó? ¿hay algo nuevo?*

El tono es sobrio y denso. Las cifras van en monoespaciada, las etiquetas en mayúsculas pequeñas, y el color se reserva para decir algo: éxito, aviso o fallo. Lo demás es gris. La profundidad se logra con escalones de gris y líneas finas, no con sombras. El movimiento existe pero no se nota: entradas de 160 ms y transiciones de 140 ms, y nada de eso ocurre si el sistema pide movimiento reducido.

La doctrina vive en el código (`web/src/theme/`, `web/src/components/ui/`, `web/src/layouts/full/`) y este documento la recoge después del rediseño completo de las ocho pantallas. Cuando algo no esté aquí, mira primero el componente de `components/ui/` que lo resuelve.

**Key Characteristics:**
- Fondo casi negro (`#0A0C0E`) con superficies grafito que suben de nivel.
- Sin sombras: separación por borde de 1px y por el escalón entre superficies.
- Un solo acento frío (cian apagado) y tres colores saturados reservados a estado.
- Cifras y fechas en monoespaciada con números tabulares, y la hora **siempre en 12h con am/pm**.
- Denso: tablas `size="small"`, texto de 12–14px, rejillas de hasta cinco columnas.
- Solo modo oscuro: la app arranca siempre con `appTheme` (`App.tsx`), no hay conmutador.
- Tres anchos de chasis: cajón temporal, carril de 64px y barra completa de 224px.

## Colors

Paleta de tono frío y muy contenida. Hay dos familias: los grises, que construyen el espacio y la jerarquía, y tres colores de estado. El cian es el único acento.

### Primary
- **Cian apagado** (primary.main): acento único. Foco de teclado (`outline` de 1px con offset 2), selección de texto, marca `NOVUS·JOBS` de la barra lateral, texto del enlace activo del menú, botones `contained`, relleno de las barras de progreso y del ranking de Enfoque, y el contorno con el que se resalta una oferta a la que acabas de saltar.
- **Cian profundo** (primary.dark): fondo de la selección de texto y hover del botón `contained`.
- **Velo de cian** (`accent-veil`, `primary.light`): reposo de todo `Button variant="text"` primario y fondo de `action.selected`.

### Secondary
- **Gris azulado** (secondary.main): acciones secundarias y el texto de apoyo. Coincide con `text.secondary` y `grey.500`: es el mismo gris que las etiquetas y las pistas.

### Estado
- **Verde** (success.main): búsqueda correcta, la cifra "Nuevas" cuando es mayor que cero, el "En curso" del contador lateral, el aviso de guardado y la franja de un término emergente en Enfoque. Nunca decora.
- **Ámbar** (warning.main): avisos que no son fallo. Pasada parcial, oferta vía agregador, chip "Por confirmar".
- **Rojo** (error.main): solo fallo: búsqueda fallida, sesión caducada, error de carga. Es la única señal que tiñe una fila entera.
- **Info** (= cian del acento): el aviso de "Búsqueda en curso" del dashboard y cualquier `Alert severity="info"`.

### Neutral
- **Ink** (background.default): fondo de página, de la cabecera y del recuadro del contador lateral. Es el suelo.
- **Surface** (background.paper): tarjetas, tablas, paneles laterales, diálogos y popovers. Un escalón por encima del fondo.
- **Graphite 100** (grey.100): fondo de bloques de texto en monoespaciada, como el cuerpo del anuncio de una oferta.
- **Graphite 200** (grey.200): trazo de los campos de texto en reposo y pista de `LinearProgress`.
- **Graphite 300** (grey.300): fondo del enlace activo del menú, de los iconos cuadrados de plataforma, del hover de una tarjeta pulsable y pista de las barras del ranking y del contador.
- **Divider**: todos los bordes y separadores: tarjetas, tablas, cabecera, barra lateral, pie y líneas entre filas.
- **Graphite 400** (grey.400): borde de una tarjeta pulsable al pasar el cursor.
- **Velo de hover** (`hover-veil`, `action.hover`): fondo del hover de una fila de lista o de un enlace del menú.
- **Text primary**: texto de cuerpo y cifras que hay que leer. **Text secondary** (= muted): etiquetas, pistas y datos de apoyo.

### Named Rules
**The Three Colors Rule.** Solo hay tres colores saturados (verde, ámbar, rojo) y cada uno significa un estado. Un color de estado nunca decora: si no hay estado, es gris.

**The Pilot Not Message Rule.** El color de estado va en un punto de 8px o en un aviso. El mensaje va en texto, para que se lea sin color. Por eso el fallo se escribe también en rojo y en negrita.

**The No Raw Color Rule.** Ningún `#hex`, `rgb()` ni `rgba()` fuera de `src/theme/`. Se comprueba con `grep -rnE "#[0-9A-Fa-f]{3,6}|rgba?\(" web/src | grep -v web/src/theme/`, que hoy sale vacío y debe seguir saliendo vacío.

## Typography

**Display / Body Font:** `system-ui` con respaldo de `-apple-system`, `Segoe UI`, `Roboto` y `sans-serif`. Sin fuentes externas: la herramienta funciona sin conexión.
**Label / Mono Font:** `ui-monospace`, `SFMono-Regular`, `Menlo`, `monospace`. Para cifras, identificadores, fechas, etiquetas de cabecera y el logotipo.

**Character:** sans de sistema para leer y mono para verificar. Lo que es un dato va en mono, lo que es una frase va en sans.

### Hierarchy
- **Page title** (`h4`, 600, 1.3125rem / 1.6rem): título de cada pantalla, con el subtítulo debajo en `subtitle1` gris.
- **Card title** (`h5`, 600, 1.125rem): título dentro de una tarjeta, con `subtitle2` gris debajo.
- **Section title** (`h6`, 600, 1rem; a menudo bajado a 14px con `sx`): encabezado de bloque, como "Búsquedas" o "Recién llegadas".
- **Body** (`body1`, 400, 0.875rem / 1.334rem): texto corriente, celdas, mensajes vacíos.
- **Body small** (`body2`, 400, 0.75rem / 1rem): texto de apoyo, etiquetas de estado, datos de tarjeta de oferta.
- **Caption** (0.75rem, 1.66, sin override): pista debajo de una cifra y el motivo de fallo truncado en la tabla.
- **Mono** (variant `mono`, 400, 0.8125rem, tabular): fechas, horas, recuentos en línea y el logotipo `NOVUS·JOBS`. Es la variante por defecto de un dato dentro de una frase.
- **Label** (variant `label`, mono, 500, 0.6875rem, tracking 0.08em, **mayúsculas**): rótulos de campo y de panel. Lo pone en mayúsculas el propio tema.
- **Overline** (mono, 500, 0.6875rem, tracking 0.08em): cabeceras de tabla, etiqueta de cifra y la etiqueta fija "Ofertas de empleo" de la cabecera. Igual que `label` pero sin forzar mayúsculas.
- **Metric** (mono, 500, 2rem, altura 1, tabular): solo las cifras de los contadores; baja a 1.0625rem cuando el contador lateral enseña una palabra en vez de un número.

### Named Rules
**The Mono Figures Rule.** Cualquier cifra que se compare, una fecha o un identificador va en mono con números tabulares, para que las columnas se alineen.

**The Label Is Not Content Rule.** La variante `label` pone el texto en MAYÚSCULAS, así que solo vale para rótulos de tres o cuatro palabras: "PRÓXIMA BÚSQUEDA", "ESTADO", "RITMO". Nunca para una frase, un nombre de empresa, un título de oferta ni una hora. Si el texto es contenido, usa `mono` o `body2`.

**The Twelve Hour Rule.** La hora se escribe siempre en formato de 12 horas con `am`/`pm` (`format.ts` fija `hour12: true`, y `hourLabel` en el editor de horarios hace lo mismo). No hay hora militar en ninguna pantalla.

## Layout

Modelo de dos columnas: barra lateral a la izquierda y columna de contenido a la derecha, con la cabecera arriba y el pie abajo dentro de esa columna.

- **Barra lateral**, tres formas según el ancho:
  - Por debajo de `sm` (600px): oculta; se abre como cajón temporal desde el botón de menú de la cabecera y se cierra al navegar.
  - De `sm` a `lg`: **carril de 64px**, solo iconos centrados, con el nombre de cada destino en un `Tooltip` a la derecha.
  - Desde `lg` (1200px): **barra completa de 224px**, con la marca, los grupos y el contador de próxima búsqueda.
- **Cabecera:** `AppBar` pegada arriba, fondo ink, borde inferior divider, `Toolbar variant="dense"`. Lleva el botón de menú (solo en móvil), la etiqueta `OFERTAS DE EMPLEO`, el conmutador de idioma ES/EN y la campana de notificaciones con su contador.
- **Contenido:** `Container maxWidth={false}` con tope de 1600px, 16px de margen lateral en móvil y 32px desde `sm`, y 24px arriba y abajo.
- **Pie:** franja de 46px con borde superior divider, alineada con el hueco de 46px que la barra lateral reserva al final. Las dos piezas forman **una sola línea** que cruza la pantalla.
- **Rejilla de cifras del dashboard:** 1 columna en móvil, 2 desde `sm`, 3 desde `md`, 5 desde `lg`.
- **Dashboard y Enfoque:** rejilla de contenido más **panel lateral** (`minmax(0, 1fr)` + 248/280/300px según `md`/`lg`/`xl`), con los paneles alineados arriba.
- **Densidad:** tablas `size="small"`, filas de ranking de 56px, enlaces de menú de 38px. Es una herramienta de seguimiento: se busca densidad, no aire.

**Espaciado** (unidad de MUI = 8px, sin escala propia):
- Bajo la cabecera de página: `mb` 3 (24px). Bajo la rejilla de cifras: `mb` 4 (32px).
- Entre tarjetas de una rejilla: `gap` 2 (16px); entre contenido y panel lateral: `gap` 2.5 (20px).
- Dentro de una tarjeta: 20px en las cifras, 18px en un panel lateral, 24px en una tarjeta de integración.
- **Un aviso sobre un bloque lleva 18px por debajo** (`mb` 2.25): un `AppAlert` pegado a la primera tarjeta se lee como parte de ella.
- Vacío centrado: `py` 4 (32px); vacío de tabla: `py` 2 (16px).
- **Ancla de sección:** cualquier destino de un enlace interno lleva `scrollMarginTop: 96`, para no quedar debajo de la cabecera pegada.

### Named Rules
**The One Footer Rule.** El pie y el hueco final de la barra lateral miden lo mismo (46px) y comparten el borde superior. Si cambias uno, cambias el otro: la línea tiene que cruzar entera.

## Elevation & Depth

Sin sombras. Está explícito en `theme/Shadows.tsx`: los 25 niveles son `none`. Las tarjetas propias (`BlankCard`, `DashboardCard`) usan `elevation={0}`, y la `AppBar` también.

La profundidad sale de tres cosas:
1. **Escalón de superficie:** ink para la página, surface para tarjetas, tablas y paneles, graphite-300 para lo seleccionado.
2. **Borde de 1px** en divider: tarjetas (`variant="outlined"`), cabecera, barra lateral, pie, líneas de tabla y popovers.
3. **Contorno de foco y de destino:** 1px cian con offset de 2px. Es la única "capa" que se superpone a algo.

### Named Rules
**The Flat-By-Default Rule.** Ninguna superficie tiene sombra, ni siquiera en hover. Si algo necesita separarse, se hace con borde o con el escalón de gris. El tema además anula la sombra de `Fab` y `ButtonGroup`, que MUI trae por defecto. Un `boxShadow` nuevo se revierte, y para resaltar se usa `outline`, que no simula profundidad.

## Shapes

Forma casi cuadrada.

- **Radio base:** 3px (`theme.shape.borderRadius`). Lo heredan botones, chips, campos, tarjetas y enlaces del menú. En `sx`, `borderRadius: 1` equivale a 3px.
- **Excepciones explícitas:** `LinearProgress`, con 6px; y la clase global `btn-xs` (botón cuadrado de 30px, radio 6px), que hoy no usa nadie.
- **Barras sin radio:** las barras del ranking de Enfoque y la del contador lateral son rectángulos a propósito (`borderRadius: 0`, 2–6px de alto). Son medidas, no adornos.
- **Punto de estado:** el único círculo del sistema (8px, `border-radius: 50%`).
- **Marca:** el monograma **NJ** calado en una pastilla de 26px, en cian, con la esquina superior izquierda y la inferior derecha cortadas en chaflán. La pata derecha de la N y el gancho de la J son una sola pieza continua. Es la única geometría decorativa que existe, y vive solo en la barra lateral. El original vive en [`logos/`](logos/); el componente `BrandMark` lo lleva en línea para que tome el cian del tema, y `web/public/logoIcon.svg` es el mismo dibujo sirviendo de favicon. Los tres ficheros se cambian juntos.
- **Bordes:** 1px sólidos en divider. El **dashed** está reservado a la tarjeta de auditoría.

## Components

Cada componente tiene una frase de carácter y luego sus estados. Los componentes compartidos viven en `components/ui/`.

### Page header (`PageContainer`)
- **Carácter:** título sobrio, subtítulo que dice qué se ve.
- **Estructura:** `h4` con subtítulo `subtitle1` gris, migas opcionales arriba y una acción opcional a la derecha, alineada arriba.
- **Acción típica:** la fecha de hoy en mono mayúsculas (oculta por debajo de `md`) junto a un botón `outlined` de recarga.

### Metric tile (dashboard)
- **Carácter:** un contador que es también un enlace. Cada cifra se puede abrir.
- **Shape:** `BlankCard` (outlined, sin sombra, sin padding propio) con 20px dentro; al pasar el cursor pasa a `grey.300` con borde `grey.400`.
- **Contenido:** etiqueta `overline` gris con su icono a la derecha, cifra `metric` y pista `caption` debajo.
- **Cifra:** las de un solo dígito se escriben con cero delante ("01"), para que la columna no baile. El cero pelado no se rellena.
- **Color:** `text.primary`. Solo "Nuevas" pasa a verde, y únicamente si es mayor que cero.
- **Auditoría:** "Descartadas por el filtro" lleva borde **dashed**. Es el único uso del punteado: marca lo que el filtro apartó sin que nadie lo viera.

### Panel lateral (`SidePanel` y sus tres usos)
- **Carácter:** una ficha estrecha que resume un sistema y lleva a su pantalla.
- **Shape:** borde divider, fondo surface, 18px dentro, 16px por debajo.
- **Cabecera:** `subtitle2` de 12px en negrita. Sin etiqueta en mayúsculas: es un título, no un rótulo.
- **Pie:** una línea divider de 1px y debajo un `PanelLink` — texto gris de 11px con una flecha de 13px, que se pone cian al pasar el cursor.
- **Usos:** `PlatformsPanel` (plataformas con su piloto y su última pasada), `FilterPanel` (leídas / pasaron / apartadas, con barra) y `CriteriaPanel` (el criterio del perfil).

### Lista de recién llegadas (`RecentJobs`)
- **Carácter:** las últimas ofertas en bruto, una línea por oferta, para saltar a ellas.
- **Fila:** 34px de inicial de la empresa en un cuadro grafito, título en 12px, empresa y ubicación en mono de 10px, hasta dos chips de stack, hora y día a la derecha y una flecha de salida.
- **Destino:** cada fila enlaza a `/nuevas?oferta=<id>`, no a la lista a secas.

### Tables
- **Cabecera:** overline mono en mayúsculas, gris, sin fondo.
- **Celdas:** borde inferior divider; la última fila no lo lleva. Cifras a la derecha con números tabulares, fechas en mono.
- **Fila interactiva:** `hover` de MUI y cursor de puntero.
- **Fila de fallo:** fondo `error.light` en toda la fila y franja izquierda roja de 3px en la primera celda.
- **Pie de tabla:** una franja con el total en mono de 10px a la izquierda y, a la derecha, el enlace para ampliar el período. **Ese enlace solo se pinta si hay algo más que enseñar**: si el total sin filtrar es igual al que ya se ve, no aparece.
- **Vacío:** una sola fila con `colSpan` y una frase centrada en gris.

### Ranking (Enfoque)
- **Carácter:** una tabla de barras que se lee de arriba abajo. Top 10, nunca más.
- **Fila:** rejilla de 56px con el puesto en mono con cero delante, el nombre, la barra, el recuento como `9/15` y el porcentaje a la derecha. Las dos últimas columnas y la barra desaparecen por debajo de `sm`.
- **Barra:** 6px de alto, pista `grey.300`, relleno cian, sin radio. La longitud es relativa al primero de la lista, no al total.
- **Tooltip:** `placement="top"`, sobre la fila entera, y explica qué significa la fracción. Una cifra que necesita explicación la lleva, no se deja a medias.

### Estado: piloto y etiqueta (`AppStatusPilot`)
- **Punto:** 8px, circular, sin borde: verde (correcta), gris (en curso / apagada), rojo (falló).
- **Texto:** `body2` en `text.primary`; en fallo, rojo y negrita (600).
- **Accesibilidad:** sin etiqueta visible lleva `role="img"` y un nombre accesible (`srLabel`). Un punto sin nombre no existe para un lector de pantalla.

### Chips (`AppChip`)
- **Shape:** `size="small"`, contorno, radio base.
- **Tonos:** `success`, `warning`, `error`, `neutral`. Solo cambian el contorno y el texto.
- **Uso:** stack de una oferta (neutro), "Por confirmar" (ámbar), "Nuevo" de un término emergente (verde).

### Avisos (`AppAlert`)
- **Shape:** `variant="outlined"`, icono heredado del color.
- **Severidades:** `success` (verde), `error` (rojo), `warning` (ámbar), `info` (cian).
- **Sitio:** arriba de la página, debajo de la cabecera y antes del contenido, con 18px por debajo.
- **Guardado correcto:** aviso `success` con el nombre de lo guardado, cerrable, que se va solo a los **3 segundos**.
- **Búsqueda en curso:** aviso `info` con el título en negrita y el detalle a continuación, en la misma línea.
- **Fallo con qué hacer:** nombre del problema en negrita, un guion y el consejo; debajo, el texto crudo del error en `caption` al 80% de opacidad.
- **Pasada parcial:** ámbar, no rojo. Hay datos, pero algo hay que arreglar.

### Job card (`JobCard`)
- **Shape:** `BlankCard` con el título en `h5` y la empresa, modalidad, plataforma y fecha debajo en una línea de apoyo.
- **Cuerpo:** `body2`; el anuncio completo va en un bloque `pre` con fondo `grey.100`, colapsado y con botón para expandir.
- **Acciones:** `contained` para Postularse; iconos `outlined` para enlace, correo, marcar como vista, guardar y descartar. No se muestra la acción del estado actual.
- **Destino resaltado:** al llegar desde un enlace con `?oferta=<id>`, la tarjeta se trae al centro de la vista y queda con un `outline` cian de 1px con 2px de separación durante **2,8 s**; el parámetro se borra de la URL al instante, así que recargar no vuelve a resaltar.

### Carga (`JobSkeleton` y `CircularProgress`)
- **Lista de ofertas:** esqueletos con la forma exacta de la tarjeta (inicial, dos líneas de título, dos de texto, chips y botón). Nunca una lista en blanco.
- **Pantalla entera:** `CircularProgress` centrado en un bloque de `max(240px, calc(100vh - 320px))`, para que quede en el centro de lo que se ve y no pegado arriba.

### Buttons
- **Shape:** radio base, sin sombra, texto sin mayúsculas y peso 400.
- **Contained:** fondo cian, texto ink. La acción de mayor peso.
- **Outlined:** contorno primario; al pasar el cursor se rellena de cian y el texto pasa a ink.
- **Text:** velo de cian en reposo; al pasar el cursor, se rellena.
- **ToggleButton:** se usa para elegir entre modos (idioma, ritmo, presets de intervalo, horas del día). El seleccionado va en `grey.300`.
- **Foco:** `outline` de 1px cian con offset de 2px, siempre visible con teclado.

### Inputs
- **Shape:** contorno, radio base, relleno 12px 14px (8px 14px en pequeño).
- **Trazo:** `grey.200` en reposo; cian en hover y en foco.
- **Ancho según el dato:** un campo de minutos mide 104px. Un campo no se estira más de lo que cabe en él.
- **Par Guardar / Cancelar:** todo formulario que se guarda lleva los dos, `contained` y `text`, y los dos se **deshabilitan cuando no hay nada que guardar**.

### Navigation (barra lateral)
- **Marca:** las tres barras inclinadas en cian y `NOVUS·JOBS` en mono de 15px, peso 600. En el carril, solo la marca.
- **Grupos:** subtítulos en mono mayúsculas de 10px: "Monitor", "Ofertas", "Auditoría", "Sistema".
- **Enlace:** 38px de alto, radio base, borde transparente, texto gris; al pasar el cursor, velo de hover y texto `text.primary`.
- **Enlace activo:** fondo `grey.300`, borde divider y texto cian. Es la única marca de dónde estás.
- **Contadores:** `Badge` o chip a la derecha del nombre, solo en las vistas que cuentan.
- **Carril:** mismo enlace sin texto, centrado, con el nombre en `Tooltip`.
- **Contador de próxima búsqueda:** recuadro de fondo ink y borde divider al final de la barra, con el rótulo "PRÓXIMA BÚSQUEDA" en `label`, la cuenta atrás en `metric`, la hora y las plataformas en mono de 11px, y una barra de 2px con lo transcurrido. Mientras hay una pasada corriendo dice **"En curso"** en verde y pregunta al servidor cada 5 s en vez de cada 30.

### Notificaciones (campana de la cabecera)
- **Campana:** `IconBell` de 18px con un `Badge` verde (9px) con las no leídas; abrirlo las marca como leídas.
- **Menú:** 360px de ancho, 420px de alto máximo, con el rótulo "NOTIFICACIONES" en `label` y un divider.
- **Entrada:** piloto de estado a la izquierda, título en `body2` negrita, detalle en `caption` y la fecha debajo en `label` al 70%.
- **Vacío:** una entrada deshabilitada con la frase de vacío.
- **Origen único:** un solo sondeo de `/stats` en `notifications.tsx` alimenta la campana, el pie y la barra lateral. No añadas otro.

### Pie (`AppFooter`)
- 46px, borde superior divider, y a la derecha la hora de la última sincronización en mono de 9px con una marca de verificación de 12px. Nada más: el pie no es un sitio para enlaces.

### Pagination (`AppPagination`)
- A la izquierda, `body2` gris con el rango y el total ("1-10 de 42 búsquedas"); a la derecha, los controles de MUI.
- **Con una sola página no se pinta.** Un control que dice "1" compite con lo que sí se pulsa.

### Progress
- **Circular:** centrado, para la primera carga de una pantalla sin forma conocida.
- **Lineal:** pista `grey.200`, radio 6px.
- **Barras de medida:** rectángulos de 2–6px, pista `grey.300`, relleno cian, sin radio.

### Movimiento (`Rise`)
- **Entrada:** `novus-rise`, 160 ms `ease-out`, desde 10px abajo (16px en el contador lateral) y opacidad 0. Se aplica al contenido de cada página, a las tarjetas de una lista escalonadas de 35 ms hasta un máximo de 5, y al recuadro del contador con 120 ms de retraso.
- **Transiciones:** 140 ms en el color de fondo de un enlace o una fila, 150 ms en una tarjeta pulsable, 420 ms para apagar el resalte de una oferta.
- **Movimiento reducido:** con `prefers-reduced-motion: reduce`, `Rise` devuelve su contenido sin envoltorio, el contador deja de latir cada segundo y el desplazamiento a una oferta es instantáneo. No es una animación más corta: es ninguna.

### Componentes disponibles pero sin usar
`DashboardCard`, `AppTabs`, `AppDialog` y `StatsRow` existen y no los usa ninguna pantalla. Antes de reutilizar `DashboardCard`, corrige su padding: el `MuiCard` del tema pone 15px y ella añade 24px en `CardContent`, lo que da 39px de aire, fuera del sistema.

## Empty states

El vacío es un estado legítimo, no un error, y debe decir **por qué** está vacío. Dos situaciones distintas no pueden compartir la misma frase.

- **Lista sin resultados:** bloque de 320px de alto mínimo, con borde divider, un icono de 30px al 50% de opacidad, un título de 16px y una pista de 12px debajo.
- **Tabla sin filas:** una fila única con `colSpan` y la frase centrada con `py` 2.
- **Búsqueda que leyó pero no guardó:** un texto que lo explica ("Leyó N publicaciones y no guardó ninguna: todas estaban ya vistas"). No es un fallo: el 0 no debe parecer roto.
- **Sin datos aún:** esqueleto si la forma se conoce, indicador centrado si no.
- **Cifra en cero:** sigue en `text.primary`. El verde solo aparece con un valor mayor que cero.

### Named Rules
**The Explain The Empty Rule.** Cada vacío dice por qué. Una pantalla vacía sin explicación parece rota.

**The Invisible Work Rule.** Lo que el sistema hizo y descartó se muestra y se puede abrir. Un contador que no lleva a sus ofertas obliga a creer lo que dice.

## Do's and Don'ts

### Do:
- **Do** usar el cian para foco, selección, marca, enlace activo, botones de acción y resaltes. No para decorar texto.
- **Do** poner el mensaje en texto junto al color de estado, y el fallo también en negrita.
- **Do** usar mono y números tabulares para cifras, fechas e identificadores, y la hora en 12h con am/pm.
- **Do** reservar la variante `label` para rótulos cortos: el tema los pone en mayúsculas.
- **Do** separar superficies con un borde divider de 1px o un escalón de gris.
- **Do** dejar 18px entre un aviso y el bloque que hay debajo.
- **Do** dar a cada formulario un par Guardar / Cancelar, deshabilitados mientras no haya cambios.
- **Do** enseñar el aviso de guardado arriba de la página, en verde, y quitarlo a los 3 segundos.
- **Do** cargar una lista con esqueletos de su misma forma.
- **Do** explicar cada vacío con una frase que diga por qué está vacío.
- **Do** usar el borde dashed solo para datos de auditoría.
- **Do** anular toda animación bajo `prefers-reduced-motion`.

### Don't:
- **Don't** añadir sombras, ni siquiera en hover. Para resaltar, `outline`.
- **Don't** usar verde, ámbar o rojo como decoración, ni como único indicador: siempre con texto.
- **Don't** poner contenido en la variante `label`: una hora, un nombre o una frase en mayúsculas no se lee.
- **Don't** escribir una hora en formato de 24 horas.
- **Don't** guardar al cambiar un control de modo o al pulsar un preset: eso rellena el formulario, el que guarda es Guardar.
- **Don't** sacar un `AppSnackbar` flotante para confirmar una acción: el sitio del aviso es arriba de la página. *(Quedan tres usos heredados en `SettingsPage`, `JobsPage` y `JobList`; se migran cuando se toquen.)*
- **Don't** dejar un botón que no cambia nada visible: si no hay más historial que enseñar, el enlace no se pinta.
- **Don't** añadir un segundo sondeo de `/stats`: el proveedor de notificaciones ya lo hace.
- **Don't** introducir una fuente externa. La pila es la del sistema y debe funcionar sin conexión.
- **Don't** añadir un modo claro ni un conmutador de tema.
- **Don't** dejar un vacío sin frase, ni usar la misma frase para dos vacíos distintos.

## Cómo seguir el patrón

Lista corta para quien llega nuevo. Antes de dar una pantalla por buena:

- **Tokens, no colores a pelo.** `primary.main`, `text.secondary`, `error.light`, `divider`, `action.hover`. El grep de la regla *No Raw Color* tiene que salir vacío.
- **Tipografía del tema.** Variantes `h4`, `h5`, `h6`, `body1`, `body2`, `overline`, `label`, `mono`, `metric`. `fontSize` a pelo solo para bajar un título de sección a 12–14px, que es un uso ya establecido.
- **Estados.** Verde, ámbar o rojo solo si significan algo, y siempre con texto al lado.
- **Vacíos.** Una frase que diga por qué. En tabla, fila única con `colSpan`; en lista, el bloque con icono.
- **Tabla.** `size="small"`, cifras a la derecha, fechas en `mono`, fila pulsable con `hover`.
- **Tarjeta.** `BlankCard`. El aire va dentro, en el hijo. No uses un `Card` suelto.
- **Movimiento.** `Rise` para entrar, 140 ms para un hover, y nada bajo movimiento reducido.
- **Componentes.** Busca primero en `components/ui/`; crea uno nuevo solo si no existe, y entonces documéntalo aquí.
- **Verificación.** `cd web && npx tsc --noEmit && npx eslint src --max-warnings=0`, y **mira la pantalla servida a 1600, 1100 y 760 px sin ocultar las barras de desplazamiento**. Un `200` no es una comprobación visual.
