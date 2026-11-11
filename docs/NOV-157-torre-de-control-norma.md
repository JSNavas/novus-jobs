# NOV-157 — Torre de control: norma visual

**Qué resuelve:** deja escrita la norma del tema oscuro "Torre de control" (NOV-155) para que cualquiera pueda seguir el patrón sin leer el código. Solo documentación: no cambia ni código ni estilos.

## Frontend — NOV-158 · Frontend Developer · 2026-11-11

### Entregable
- `DESIGN.md` en la raíz del repo (commit `37b8f96`, rama `feat/control-tower-default-theme`). Este sí se commitea.

### Cómo se generó y se corrigió
- Partió del comando de documentar de la skill `impeccable` sobre el código existente.
- Se corrigió a mano contra `web/src/theme/*` (DefaultColors, Typography, Shadows, Components, Theme) y contra `views/dashboard`, `views/jobs`, `layouts/full` y `components/ui`.
- Errores corregidos: ruta de `DashboardPage` (vive en `views/dashboard/`); el chip "Descartada por el filtro" es rojo, no ámbar; el aviso de motivo de descarte es ámbar; el texto de sesión caducada es "Hay que iniciar sesión otra vez"; el fondo de los botones `text` de color primario es su reposo, no un "estado activo"; el margen de 32px es bajo la rejilla de cifras y no sobre la paginación; el padding de 20px pertenece al recuadro interior de la tarjeta, no a `BlankCard`; acciones de la oferta y acciones de estado documentadas por separado.
- Añadido lo que faltaba: la variante `mono` (0.8125rem) y el paginador.

### Nota
- No se tocó código. Por eso no aplica `tsc`/`build`: no hay nada que compilar. `verificar --base main` sin fallos mecánicos.

## GAPs y decisiones
- Sin GAPs de la subtarea. El `DESIGN.md` describe el tema tal como está en `main`; si el tema cambia, el documento debe revisarse.
