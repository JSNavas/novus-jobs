# Catálogo de componentes UI

Todos viven en `src/components/ui/` y se importan desde `src/components/ui` (el `index.ts` los reexporta). Las pantallas no importan `Dialog`, `Modal`, `Chip`, `Alert`, `Tabs` ni `Snackbar` de `@mui/material`: si lo hacen, ESLint falla (ver `ui-rules.md`).

Ninguno de estos componentes recibe colores, márgenes o tipografías a mano. Se usan los tokens del tema (`src/theme/`).

## AppDialog

Modal de la aplicación. Úsalo para cualquier diálogo: formulario, confirmación o detalle.

- Props:
  - `open: boolean`: controla si se ve.
  - `title: string`: título del diálogo.
  - `children: ReactNode`: contenido.
  - `onClose: () => void`: se llama al pulsar «Cancelar», al hacer clic fuera o con Escape.
  - `confirmLabel?: string` y `onConfirm?: () => void`: si se pasan los dos, aparece un botón primario de confirmación junto a «Cancelar». Si no, solo está «Cancelar».
- Ejemplo:
  ```tsx
  <AppDialog open={open} title="Descartar oferta" onClose={() => setOpen(false)} confirmLabel="Descartar" onConfirm={discard}>
    Esta oferta dejará de mostrarse.
  </AppDialog>
  ```
- No hacer: no abrir un `Dialog` de MUI directamente ni meter botones de acción en `children`.

## AppChip

Etiqueta pequeña para estados, avisos cortos y categorías.

- Props:
  - `label: string`.
  - `tone?: 'success' | 'warning' | 'neutral'`: intención. Por defecto `neutral`.
- Ejemplo:
  ```tsx
  <AppChip label="Por confirmar" tone="warning" />
  ```
- No hacer: no usar `tone` para decorar. Si no hay una intención clara, `neutral`.

## AppAlert

Aviso en línea dentro de la página o de una tarjeta.

- Props:
  - `severity: 'warning' | 'info' | 'error'`.
  - `children: ReactNode`: el texto del aviso.
- Ejemplo:
  ```tsx
  <AppAlert severity="warning">VÍA AGREGADOR — no la publica quien contrata</AppAlert>
  ```
- No hacer: no usarlo para confirmaciones de éxito. Eso es `AppSnackbar`.

## AppTabs

Pestañas de sección que cambian el listado que se muestra.

- Props:
  - `tabs: { value: string; label: string }[]`.
  - `value: string`: pestaña activa.
  - `onChange: (value: string) => void`.
- Ejemplo:
  ```tsx
  <AppTabs tabs={seniorityTabs} value={seniority} onChange={(next) => setSeniority(next)} />
  ```
- No hacer: no usarlo para navegar entre rutas. Para eso, el menú lateral.

## AppSnackbar

Mensaje breve y temporal (5 s) con el resultado de una acción.

- Props:
  - `message: string | null`: si es `null`, no se ve.
  - `severity: 'success' | 'error'`.
  - `onClose: () => void`: ponerlo a `null` en el estado del padre.
- Ejemplo:
  ```tsx
  <AppSnackbar message={notice?.message ?? null} severity={notice?.severity ?? 'success'} onClose={() => setNotice(null)} />
  ```
- No hacer: no usarlo para errores que el usuario debe corregir en un formulario. Eso va en el campo o en `AppAlert`.

## BlankCard

Tarjeta sin cabecera. Es el contenedor de cada elemento de una lista (por ejemplo, cada oferta).

- Props:
  - `children: ReactNode`.
  - `dashed?: boolean`: borde discontinuo. Marca lo que es auditoría y no trabajo pendiente. Por defecto `false`.
- Ejemplo:
  ```tsx
  <BlankCard>
    <Box p={3}>…</Box>
  </BlankCard>
  ```
- No hacer: no poner padding extra dentro de la tarjeta sin necesidad. Pon el padding en el contenido.

## AppStatusPilot

Luz de estado: un punto de color y, si se pasa, el texto al lado. El texto es el que se lee sin color.

- Props:
  - `tone: 'success' | 'error' | 'neutral'`: correcto, fallo o en curso/sin intención.
  - `label?: string`: si falta, solo se ve el punto (para espacios estrechos, como el menú).
- Ejemplo:
  ```tsx
  <AppStatusPilot tone="error" label="Falló" />
  ```
- No hacer: no usarlo para decorar. El rojo es solo para fallo; un estado sin color claro es `neutral`.

## DashboardCard

Tarjeta con título, subtítulo opcional y una acción opcional a la derecha. Para bloques con cabecera, como un panel de estadísticas.

- Props:
  - `title: string`.
  - `subtitle?: string`.
  - `action?: ReactNode`: por ejemplo, un botón.
  - `children: ReactNode`.
- Ejemplo:
  ```tsx
  <DashboardCard title="Última búsqueda" subtitle="LinkedIn" action={<Button variant="outlined">Ver</Button>}>
    …
  </DashboardCard>
  ```
- No hacer: no usarla como lista de elementos. Para eso, `BlankCard`.

## PageContainer

Cabecera de cada pantalla: migas de pan opcionales, título, subtítulo y una acción principal. Después va el contenido de la página.

- Props:
  - `title: string`.
  - `subtitle?: string`.
  - `breadcrumbs?: BreadcrumbItem[]`: si se pasa, muestra `Breadcrumb` encima del título.
  - `action?: ReactNode`: normalmente el botón primario de la página.
  - `children: ReactNode`.
- Ejemplo:
  ```tsx
  <PageContainer title="Ofertas de empleo" subtitle="…" action={<Button variant="contained">Buscar ahora</Button>}>
    …
  </PageContainer>
  ```
- No hacer: no repetir el título dentro de `children`.

## Breadcrumb

Migas de pan. Lo usa `PageContainer` cuando recibe `breadcrumbs`; no hace falta montarlo a mano.

- Tipo `BreadcrumbItem`: `{ title: string; to?: string }`. Sin `to`, es el elemento actual y no es enlace.
- Ejemplo:
  ```tsx
  <Breadcrumb items={[{ title: 'Inicio', to: '/' }, { title: 'Ofertas' }]} />
  ```

## Botones (sin componente propio)

Los botones son el `Button` de MUI, con tres variantes fijas. Así una acción tiene el mismo peso en toda la aplicación:

- `variant="contained"`: la acción principal de la vista. Solo una por pantalla o tarjeta (por ejemplo «Guardar», «Postularse»).
- `variant="outlined"`: acción secundaria (por ejemplo «Marcar como vista», «Ver publicación»).
- `variant="text"`: acción terciaria o de baja importancia (por ejemplo «Descartar», «ver más»).

No hacer: no cambiar `color`, `size` ni estilos del botón en la pantalla para «destacarlo».
