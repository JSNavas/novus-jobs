# Installing Novus Jobs

Everything here happens on one machine: yours. There is no server to rent and
no account to create.

- [Requirements](#requirements)
- [Install](#install)
- [Configure](#configure)
- [Log in to a platform](#log-in-to-a-platform)
- [Keep it running](#keep-it-running) — macOS, Linux, Windows
- [Back up and move your data](#back-up-and-move-your-data)
- [Troubleshooting](#troubleshooting)

## Requirements

| | |
|---|---|
| **Node.js 22 or newer** | `node -v`. The server uses `process.loadEnvFile` and the built-in test runner, both of which need 22. |
| **~400 MB of disk** | Mostly the Chromium that Playwright downloads for platforms that need a session. |
| **A browser** | To open the dashboard. |

Optional, and the app works fully without them:

- A **Gemini API key** ([free tier](https://aistudio.google.com/apikey)) for the
  LLM judge and for reading your CV with a model.
- A **Resend API key** for email notifications.

No database to install: it is a SQLite file.

## Install

```bash
git clone https://github.com/JSNavas/novus-jobs.git
cd novus-jobs

cd web && npm ci && npm run build && cd ..
cd server && npm ci && npm run build
```

The server serves the built dashboard itself, so `web` only needs building once
per update — there is no second process to run.

Platforms that read a logged-in page need Chromium:

```bash
npx playwright install chromium
```

Then start it:

```bash
cd server && npm start
```

Open <http://127.0.0.1:47831>. The first run sends you to the setup wizard.

## Configure

Two separate things, split by whether a restart should be needed to change them.

**In the app** — your profile (stack, English, location, time zone,
arrangements), the
motivation paragraph, how old a posting can be, which platforms are on and how
often each runs. All stored in the database, all applied on the next search,
none of it needing a restart. Correcting a typo in a sentence should never
force you to restart a service.

**In `server/.env`** — ports, paths, credentials. Read once at startup.
Copy `server/.env.example`, which documents every variable; all of them have
defaults and an empty file is a valid configuration.

The two you will most likely want:

```bash
# Keep your data outside the repo, so a fresh clone cannot touch it
DATA_DIR=/Users/you/.novus-jobs/data

# The LLM judge, and the optional CV reading
GEMINI_API_KEY=...
```

## Log in to a platform

Only for platforms that read a page behind a session. Once per platform:

```bash
cd server && npm run login -- linkedin
```

A real browser window opens. Take your time, solve any verification, and
**close the window once you are inside** — closing it is what saves the session.
There is no timer.

The session lives in `~/.novus-jobs/browser-profiles/`, outside the repo on
purpose: it is the one thing here you cannot regenerate, so no `npm ci`, build
or clean should be able to delete it. The cookie file is `0600` and never
enters git.

You do not need to stop the server: the login asks it over HTTP to release the
browser, searches pause while the window is open, and resume when you close it.

## Keep it running

The point of this project is that it searches while you do something else. That
means a background service that starts with your computer.

### macOS — launchd (built in)

```bash
cd server
npm run service:install     # builds, writes the launchd plist, starts it
npm run service:restart     # after pulling changes and rebuilding
npm run service:uninstall
```

It writes `~/Library/LaunchAgents/com.novusjobs.server.plist` and logs to your
data directory. Being a *user* agent and not a daemon is deliberate: it runs as
you, with access to your own files, and stops when you log out.

### Linux — systemd user unit

There is no installer for this one; the unit is six lines. Create
`~/.config/systemd/user/novus-jobs.service`:

```ini
[Unit]
Description=Novus Jobs
After=network-online.target

[Service]
Type=simple
WorkingDirectory=%h/novus-jobs/server
ExecStart=/usr/bin/node %h/novus-jobs/server/dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
```

Adjust the two paths, then:

```bash
systemctl --user daemon-reload
systemctl --user enable --now novus-jobs
systemctl --user status novus-jobs
journalctl --user -u novus-jobs -f     # logs
```

A **user** unit, not a system one, for the same reason as on macOS: it runs as
you and reads your files. One catch — a user unit stops when you log out unless
you allow lingering:

```bash
sudo loginctl enable-linger "$USER"
```

Without that, searches only run while you are logged in, which may well be what
you want on a laptop.

### Windows — Task Scheduler

Create a task that runs at logon:

```powershell
$action  = New-ScheduledTaskAction -Execute "node.exe" `
  -Argument "$HOME\novus-jobs\server\dist\index.js" `
  -WorkingDirectory "$HOME\novus-jobs\server"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName "Novus Jobs" -Action $action -Trigger $trigger -Settings $settings
```

Run it, check it, remove it:

```powershell
Start-ScheduledTask -TaskName "Novus Jobs"
Get-ScheduledTask -TaskName "Novus Jobs" | Get-ScheduledTaskInfo
Unregister-ScheduledTask -TaskName "Novus Jobs" -Confirm:$false
```

A console window will flash at logon. If that bothers you, wrap it with
[NSSM](https://nssm.cc/) and run it as a real service instead — but note that a
service running as `SYSTEM` cannot see the browser session you saved as
yourself, so if you use platforms that need a login, run it as your own user.

### Updating

```bash
git pull
cd web && npm ci && npm run build && cd ../server && npm ci && npm run build
npm run service:restart      # or: systemctl --user restart novus-jobs
```

Your database is migrated on startup, in place and additively. It is never
rewritten from scratch, and nothing is deleted — but take a backup anyway, see
below.

## Back up and move your data

Everything you care about is in your data directory (`server/data` by default,
or `DATA_DIR`):

```
jobs.db        the postings, the searches, your profile and your settings
cv/            your CV, as you uploaded it
logs/
```

Plus `~/.novus-jobs/browser-profiles/`, which holds your sessions.

To back up while the server is running, do not copy `jobs.db` with `cp` — it is
in WAL mode and you would get a torn file. Use SQLite's own backup:

```bash
sqlite3 server/data/jobs.db ".backup '$HOME/novus-jobs-backup.db'"
```

Moving to another machine is copying those two directories across.

## Troubleshooting

**`falta playwright: npm i && npx playwright install chromium`**
A platform that needs a browser could not find one. Run that command.

**The dashboard says a search failed with "no session"**
The platform logged you out. Run `npm run login -- <platform>` again. The app
refuses to retry that platform until you do — hammering a login page is exactly
what gets an account flagged.

**The times are wrong**
Your time zone is part of your profile, picked during setup and editable in
Settings → Edit my profile. Search slots are hours on that clock, the daily
read budget resets at that midnight, and the dashboard formats every date with
it. It defaults to the machine's own zone, which is only wrong if the server
runs somewhere you do not.

**Nothing is being searched**
Three things to check, in order: the setup wizard is finished (unfinished, the
scheduler does not run — without a profile every posting would be discarded);
at least one platform is on in Integrations; and `SCHEDULER_ENABLED` is not
`false` in your `.env`.

**Everything is being discarded**
Open *Discarded by the filter*: every rejection carries its reason. The usual
cause is a veto on an ecosystem you actually work in — check the last step of
your profile. A veto is the one setting that fails silently, which is why that
screen exists.

**Port already in use**
Set `PORT` in `.env`. The server always binds `127.0.0.1`; it is not meant to be
reachable from your network, and it has no authentication.

**`CHECK constraint failed` on startup**
You are on a database from before the multi-user migration and something went
wrong rebuilding the `jobs` table. Restore your backup and open an issue with
the message — that migration is supposed to be automatic.
