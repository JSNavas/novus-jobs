# Novus Jobs — brief de rediseño para Lovable

Pégalo entero en Lovable como primer mensaje. Es un encargo **solo de diseño de
interfaz**: no hay backend que construir, ni autenticación, ni base de datos.

---

## 1. Qué construir

Un **dashboard web de escritorio, solo modo oscuro**, con datos de ejemplo
(mock, en el propio front), que sea la versión visualmente profesional de una
herramienta que ya existe y funciona.

Stack obligatorio, porque el resultado se trasplanta a un proyecto real:

- **React 19 + TypeScript + Vite**
- **MUI v7** (`@mui/material`, `@emotion/react`, `@emotion/styled`) con un tema
  propio en `theme/`
- **react-router v7** para las rutas
- **@tabler/icons-react** para iconos
- **Sin librerías de UI adicionales** (nada de Tailwind, shadcn, Chakra,
  Ant, framer-motion). Nada de fuentes externas de Google: la app tiene que
  funcionar sin conexión.

No escribas lógica de negocio. Todos los datos salen de un `src/mocks/` con
arrays tipados y realistas (puestos de software en español, empresas reales
plausibles, fechas, motivos de descarte).

---

## 2. Qué es el producto (contexto, para que el diseño tenga sentido)

Novus Jobs es un buscador de empleo automático que corre **en la máquina del
usuario**. Tres veces al día lee los portales de empleo que el usuario ha
encendido (LinkedIn, Get on Board…), aplica su criterio personal (stack, país,
idioma, vetos) y deja en la bandeja **solo las ofertas que podría aceptar**.
Lo que descarta **también se guarda, con el motivo**, para poder auditarlo.

Tres ideas que el diseño tiene que transmitir sin texto explicativo:

1. **Es una torre de control, no una app de lectura.** Se mira diez veces al
   día, de un vistazo, buscando «¿hay algo nuevo?».
2. **Nada se descarta en silencio.** La pantalla de descartadas es el
   argumento del producto: hay que verla como una pieza de primera, no como
   una papelera.
3. **Todo es local y privado.** Sobriedad de herramienta, no brillo de SaaS.

---

## 3. Sistema de diseño (punto de partida, mejorable)

Esto es lo que hay hoy. **Respeta la dirección, sube el nivel de ejecución.**
Puedes refinar valores (escalones de gris, espaciados, pesos, tamaños) si el
resultado es más legible y más pulido; no puedes cambiar el carácter: oscuro,
denso, frío, un solo acento.

### Color

```
ink           #0A0C0E   fondo de página y cabecera
surface       #12161A   tarjetas, tablas, diálogos
graphite-100  #101417   bloques de texto monoespaciado
graphite-200  #161B1F   pista de barras, trazo de inputs
graphite-300  #222930
divider       #232A31   TODOS los bordes y separadores
graphite-400  #3A444E
muted         #8A96A3   texto secundario, etiquetas
text          #D5DCE3   texto de cuerpo y cifras
accent        #7FB8C4   cian apagado: ÚNICO acento
accent-deep   #5F9AA8
ok            #5BE38F
warning       #E9A23B
failure       #FF5C5C
```

**Reglas de color, inviolables:**

- **Tres colores de estado y nada más** (verde, ámbar, rojo). Cada uno
  significa algo: verde = búsqueda correcta / hay nuevas; ámbar = aviso que no
  es fallo (pasada parcial, oferta vía agregador, «por confirmar»); rojo =
  fallo real (búsqueda fallida, sesión caducada). **Un color de estado nunca
  decora.** Si no hay estado, es gris.
- El cian es el único acento: foco de teclado, selección, logotipo, botones
  primarios. No se usa para «dar color».
- **Sin sombras.** La profundidad se construye con escalones de gris y bordes
  de 1px (`divider`). Nada de `box-shadow`, nada de glow, nada de gradientes
  decorativos.
- **Sin modo claro.** La app arranca siempre en oscuro y no hay conmutador.

### Tipografía

- **Cuerpo:** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- **Cifras, fechas, identificadores y etiquetas:** `ui-monospace,
  SFMono-Regular, Menlo, monospace`, con `font-variant-numeric: tabular-nums`

Regla: **lo que es un dato va en mono, lo que es una frase va en sans.**

Escala actual (refinable):

| uso | tamaño / peso / interlineado |
|---|---|
| título de página | 1.3125rem · 600 · 1.6rem |
| título de tarjeta | 1.125rem · 600 |
| título de sección | 1rem · 600 |
| cuerpo | 0.875rem · 400 · 1.334rem |
| apoyo | 0.75rem · 400 |
| etiqueta (mono, mayúsculas) | 0.6875rem · 500 · `letter-spacing: 0.08em` |
| cifra grande (mono) | 2rem · 500 · line-height 1 |

### Forma y ritmo

- Radio de esquina: **3px**. Nada redondeado.
- Rejilla de **8px**; en zonas densas, múltiplos de 4px.
- Tablas MUI `size="small"`, cabeceras densas.
- Ancho de contenido con tope legible; la app es de escritorio (≥1280px es el
  caso principal), pero tiene que aguantar 1024px sin romperse.

---

## 4. Pantallas a diseñar

Barra lateral fija a la izquierda con el logotipo `NOVUS·JOBS` en mono y el
indicador de **próxima búsqueda** (cuenta atrás). Cabecera superior delgada.

### 4.1 `/` — Dashboard
La torre de control. Debe responder en dos segundos: *¿funcionó? ¿hay algo
nuevo?*

- Fila de cifras: nuevas, vistas, guardadas, descartadas (mono, grandes).
- Historial de pasadas: por cada una, hora, plataforma, estado (verde / ámbar /
  rojo), ofertas leídas, ofertas que pasaron el filtro, duración.
- Aviso de la última pasada si fue parcial o falló, con el motivo escrito —
  **el mensaje se lee sin depender del color**.

### 4.2 `/nuevas` · `/vistas` · `/guardadas` · `/descartadas` — la bandeja
Lista de ofertas con filtros arriba (plataforma, fecha, texto). Cada oferta es
una tarjeta densa:

- Puesto, empresa, ubicación / remoto, fecha (mono), plataforma de origen.
- Chips de estado: «Nueva», «Por confirmar» (ámbar), «Vía agregador» (ámbar).
- Extracto del anuncio y, plegable, el cuerpo completo en mono sobre
  `graphite-100`.
- Acciones: abrir en la plataforma (botón primario), guardar, marcar como
  vista, descartar.

Diseña también el **estado vacío** («no había nada» es información, no un
error) y el estado de carga.

### 4.3 `/rechazadas` — lo que tumbó el filtro
La pantalla distintiva. Tabla densa de ofertas rechazadas **con el motivo
concreto** por cada una (país excluido, stack no coincide, idioma, duplicada,
veto del usuario). Agrupable o filtrable por motivo, con el recuento por
motivo visible. Tiene que dar la sensación de registro auditable.

### 4.4 `/enfoque` — qué piden en común
Qué tecnologías y requisitos se repiten en las ofertas que sí encajan:
ranking con recuentos y tendencia, y un apartado de términos emergentes que
aún nadie clasificó. Si usas un gráfico, que sea sobrio: barras horizontales,
un solo color, cifras en mono. Nada de donuts de colores.

### 4.5 `/configuracion` — ajustes
Formulario largo bien organizado por secciones: perfil y CV, stack y vetos,
plataformas activas con su estado de sesión, horarios de las tres pasadas,
correo de aviso. Inputs oscuros con trazo de 1px, etiquetas en mono mayúsculas.

### 4.6 `/integraciones` — plataformas
Tarjeta por plataforma: nombre, si está encendida, estado de la sesión (válida
/ caduca / sin configurar) y qué hacer si falla.

### 4.7 Alta (onboarding)
Flujo de 3–4 pasos: subir el CV, confirmar el stack que se ha deducido solo,
elegir país e idioma, encender plataformas. Es el momento «ah, vale» del
producto: tiene que verse impecable y sin fricción.

---

## 5. Qué quiero exactamente de ti

1. El **tema de MUI completo** (`theme/`): paleta, tipografía, `shape`,
   `spacing` y `components` con las sobrescrituras de `Button`, `Card`,
   `Table`, `Chip`, `Alert`, `TextField`, `Tabs`, `Dialog`, `Pagination`.
   Tiene que verse coherente **sin estilos sueltos en cada pantalla**.
2. Las **siete pantallas** de arriba, con datos mock creíbles.
3. Un puñado de **componentes reutilizables**: tarjeta de dashboard, piloto de
   estado (punto de 8px + etiqueta), chip, bloque de cifra, estado vacío,
   cabecera de página con título y subtítulo.
4. **Accesibilidad real**: contraste AA sobre fondo oscuro, foco de teclado
   visible (contorno cian de 1px con offset 2), estado que nunca se comunique
   solo por color.

## 6. Qué NO quiero

- Nada de modo claro, conmutador de tema o colores de marca alegres.
- Nada de sombras, glows, gradientes, cristal esmerilado ni animaciones
  llamativas. Transiciones de 120–160 ms como mucho, y solo en hover y foco.
- Nada de ilustraciones de stock, emojis en la interfaz ni texto de marketing.
- Nada de tarjetas gigantes con mucho aire: esto es **denso**. Prefiero ver
  veinte filas que cinco.
- Nada de «Lorem ipsum»: los datos de ejemplo son ofertas de software reales y
  plausibles, en español.

## 7. Cómo juzgaré el resultado

- ¿Se entiende en dos segundos si el buscador funcionó y si hay algo nuevo?
- ¿Parece una herramienta de operaciones de alguien que sabe, o una plantilla?
- ¿Aguanta mirarla diez veces al día sin cansar?
- ¿Se podría imprimir una captura en el README y que alguien quisiera
  instalarlo?

Empieza por el tema y el dashboard. Cuando el dashboard esté bien, el resto es
repetir el sistema.
