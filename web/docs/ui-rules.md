# Reglas de UI

Estas reglas son obligatorias para cualquier pantalla de `web/`. Las vigila ESLint (`npx eslint .`), y QA las revisa en cada entrega.

## 1. Un componente por patrón

Cada patrón de interfaz tiene un solo componente en `src/components/ui/`. Dos modales no pueden tener dos diseños: solo existe `AppDialog`.

Los patrones cubiertos son: modal, etiqueta, aviso, pestañas, notificación temporal, tarjeta, cabecera de página y migas de pan. Su descripción y uso están en `ui-components.md`.

## 2. Las pantallas importan del catálogo, nunca de MUI para estos patrones

Prohibido en `src/` (fuera de `src/components/ui/`):

```tsx
import { Dialog, Chip, Alert, Tabs, Snackbar } from '@mui/material'; // ❌
```

Correcto:

```tsx
import { AppDialog, AppChip, AppAlert, AppTabs, AppSnackbar } from '../components/ui'; // ✅
```

La regla ESLint `no-restricted-imports` (en `eslint.config.js`) bloquea `Dialog`, `Modal`, `Chip`, `Alert`, `Tabs` y `Snackbar` tanto desde `@mui/material` como desde sus subrutas (`@mui/material/Chip`, etc.). Los ficheros de `src/components/ui/` están exentos porque ahí se envuelven.

## 3. Tokens del tema, nada de valores sueltos

En las pantallas:

- Colores: `primary.main`, `text.secondary`, `grey.100`, etc. Nada de hex (`#5D87FF`) ni `rgb()`.
- Espaciado: unidades del tema (`p={3}`, `spacing={2}`, `gap: 2`). Nada de `px` sueltos para espaciar.
- Tipografía: variantes del tema (`variant="h5"`, `variant="body2"`). Nada de `fontSize` a mano salvo en elementos técnicos como `<pre>`.
- Radios y sombras: los del tema (`borderRadius` del tema, `elevation`).

Si un valor no existe en el tema, se añade al tema, no a la pantalla.

## 4. Iconos

Solo `@tabler/icons-react`. No mezclar otras librerías de iconos ni `@mui/icons-material`.

## 5. Idioma

El texto de la interfaz va en español, sin i18n. El código (identificadores, comentarios, nombres de fichero) va en inglés.

## 6. Añadir un componente nuevo al catálogo

Un componente nuevo entra en el catálogo solo si un patrón se repite o aparece en más de una pantalla. Si una pantalla necesita algo único, es un componente de esa pantalla, no del catálogo.

Pasos:

1. Crea `src/components/ui/NombreComponente.tsx`. Envuelve el componente de MUI con props propias y tipadas. No expongas las props de MUI tal cual.
2. Reexpórtalo desde `src/components/ui/index.ts`.
3. Documenta en `docs/ui-components.md`: qué es, cuándo usarlo, props, ejemplo y qué no hacer.
4. Si el patrón es uno que ESLint debe proteger (como `Dialog`), añade su ruta a la regla en `eslint.config.js` y su nombre a `restrictedPatterns`.
5. Comprueba con `npx tsc --noEmit` y `npx eslint .`.

## 7. Verificación

Antes de entregar una pantalla:

```bash
cd web
npx tsc --noEmit
npx eslint .
npx vite build
```

Los tres deben pasar sin errores y sin directivas que silencien el tipado o el lint.
