# Novus Jobs — segunda ronda

Va muy bien. Tres correcciones, por orden de importancia.

---

## 1. Enfoque está vacío de contenido (lo más importante)

La pantalla se ve bien pero muestra mucho menos de lo que el producto calcula.
Hoy cada tecnología es solo `{ nombre, recuento, tendencia }`. El modelo real
es este, y cada campo que falta es información que el usuario necesita:

```ts
type FocusTopic = {
  name: string;
  area: string;        // el área a la que pertenece el tema
  vacancies: number;
  share: number;       // % de las ofertas analizadas que lo piden
  known: boolean;      // ¿ya está en el stack del usuario, o le falta?
  isNew?: boolean;     // apareció desde la última visita
  examples: string[];  // FRASES REALES sacadas de los anuncios
};

type EmergingTerm = {
  term: string;
  vacancies: number;
  example: string | null;  // la frase real donde apareció
  isNew?: boolean;
};

type Focus = {
  analysed: number;
  windowDays: number;   // la ventana es CONFIGURABLE, no son 30 días fijos
  topics: FocusTopic[];
  emerging: EmergingTerm[];
  newCount?: number;
};
```

Lo que hay que añadir:

- **`examples`: las frases de las ofertas.** Es lo que de verdad falta. Bajo
  cada tecnología, la frase literal del anuncio que la menciona — «Experiencia
  con sistemas distribuidos y buenas prácticas de testing». Sin eso, «AWS · 18»
  es un número sin significado; con eso, el usuario ve *cómo* se lo piden.
  Despliega una o dos por tema, en mono sobre el fondo hundido, con la empresa.
- **`known`: separar lo que ya sabe de lo que le falta.** Es la decisión que el
  usuario viene a tomar en esta pantalla. Distínguelo visualmente — pero
  **recuerda que el color de estado no decora**: usa un distintivo gris
  («EN TU STACK» / «NO LO TIENES»), no verde y rojo.
- **`share`**: el porcentaje junto al recuento, como ya haces en «Requisitos
  recurrentes».
- **`area`**: agrupa o etiqueta los temas por área.
- **`isNew` y `newCount`**: marca lo aparecido desde la última visita.
- **Términos emergentes**: cada uno lleva su `example`, la frase donde
  apareció. Ahora solo se ve «Bun · 4 menciones», que no dice nada.
- **`windowDays` es configurable.** Ahora «ÚLTIMOS 30 DÍAS» es texto fijo:
  tiene que ser un selector, y el texto salir del valor.

## 2. El alta: el momento «ah, vale» no está

El `Stepper` de `/alta` está bien y el formulario plano de `/configuracion` es
correcto para editar un perfil que ya existe. Mantén los dos tal cual.

Lo que falta es el paso 2. Hoy es una lista fija de casillas. En el producto
real, **el currículum se lee y la aplicación propone sola** el stack, el nivel
de inglés, el país y la ciudad, y además sugiere vetos por ecosistema (si ve
que no has tocado Java, propone vetar el ecosistema Java entero).

Ese es el momento que vende el producto. Rehaz el paso 2 para que se vea así:
las tecnologías llegan ya marcadas y etiquetadas como **detectadas en tu CV**,
el nivel de inglés y el país vienen rellenos con lo que se dedujo, y hay un
bloque aparte de **vetos sugeridos** que el usuario acepta o rechaza. Debe
quedar claro que no lo ha escrito él: lo ha leído la máquina.

## 3. Detalles

- **Bug:** en «Recién llegadas» del dashboard la hora se calcula con
  `09:{14 - j.id * 2}` y no se rellena a dos dígitos — la tercera fila muestra
  `09:8`. Usa el campo `date` del mock, que ya es correcto.
- El número de la columna «ACEPTADAS» va en cian. El cian está reservado a
  foco, selección, logotipo y botón primario; **no decora un dato**. Déjalo en
  el color de texto normal.
- `::selection` usa el gris de los bordes; tiene que ser `accent-deep`
  (`oklch(0.65 0.065 213)`).
- Subiste la escala tipográfica: título de página a 25px y cuerpo a 13px,
  donde el sistema dice 21px y 14px. Vuelve a los valores del sistema.
- `* { box-shadow: none !important }` cumple la regla a martillazos. Quita el
  `!important` global y desactiva la elevación donde toque.
