# novus-jobs

Dashboard de búsqueda de empleo que revisa LinkedIn por cron (réplica del patrón de ARTIO) y muestra las ofertas que encajan con el perfil.

## Estructura

- `server/` — backend: pasadas programadas, reglas de filtrado y API.
- `web/` — frontend: dashboard de ofertas.

## Servidor

```bash
cd server
npm ci
npm run build
npm start                      # http://127.0.0.1:47831 (PORT)
```

Primera vez: iniciar sesión en LinkedIn una sola vez con una ventana visible. La sesión queda en `server/data/linkedin-profile/`.

```bash
cd server && npm run linkedin:login
```

Variables de entorno (`server/.env`, todas opcionales):

| Variable | Por defecto | Para qué |
|---|---|---|
| `PORT` | `47831` | Puerto de la API y de la UI |
| `SCHEDULE_HOURS` | `9,13,18` | Franjas de pasada, hora de Venezuela (UTC-4) |
| `SCHEDULER_ENABLED` | `true` | `false` apaga las pasadas automáticas |
| `JOB_SOURCES` | `linkedin` | Fuentes activas, separadas por comas |
| `LINKEDIN_FEED_URL` | `https://www.linkedin.com/feed/` | Feed que se lee |
| `ANTHROPIC_API_KEY` | — | Activa el juez LLM. Sin clave mandan solo las reglas |
| `ANTHROPIC_MODEL` | `claude-haiku-5-5` | Modelo del juez |
| `DATA_DIR` | `server/data` | Base de datos, marca de pasada y logs |

Servicio de macOS (arranca al iniciar sesión y se relanza si cae):

```bash
cd server
npm run service:install        # compila, escribe el plist de launchd y lo arranca
npm run service:restart        # reinicia tras cambiar código y recompilar
npm run service:uninstall
```

Los logs están en `server/data/logs/server.log`.

Pruebas: `cd server && npm test`.
