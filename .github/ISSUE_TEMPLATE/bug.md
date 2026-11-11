---
name: Something is broken
about: A crash, a screen that does not load, a search that fails
labels: bug
---

**What you did, what you expected, what happened**

**Logs**
From your data directory (`server/data/logs/` by default), or from the service:
`journalctl --user -u novus-jobs -n 100` on Linux.

**Environment**
OS, `node -v`, and whether you are running it by hand or as a service.

Please do not paste your CV, your `.env`, or anything with credentials.
