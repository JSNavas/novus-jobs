# Novus Jobs

**A job hunt that runs on your own machine.** Your CV never leaves your disk, your
applications are yours, and no recruiting platform learns what you are looking
for.

Novus Jobs reads **public job boards** on a schedule, throws away the 95% that
does not fit you, and leaves the rest in a local dashboard with the reason it
kept each one — and the reason it discarded all the others.

You pick which sites it reads. See [supported platforms](#supported-platforms)
for the ones that ship today, and [docs/SOURCES.md](docs/SOURCES.md) for adding
one — it is a single file.

> Español: [README.es.md](README.es.md)

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐     ┌───────────┐
│  Public job  │     │             │     │              │     │           │
│  boards you  │ ──► │   Filter    │ ──► │  LLM judge   │ ──► │ Dashboard │
│  switch on   │     │ (your rules)│     │  (optional)  │     │  (local)  │
│              │     │             │     │              │     │           │
└──────────────┘     └─────────────┘     └──────────────┘     └───────────┘
       on a schedule        rejects with a reason        you decide
```

## Why it exists

Looking for work means uploading your CV to a dozen sites, each one keeping it
forever, and then reading hundreds of postings that were never for you. The
reading is the part a machine can do, and the uploading is the part that should
not have to happen at all.

So: the CV stays in a folder on your computer. The filter runs in your own
process. The database is a SQLite file you can delete. There is no account, no
sync, no telemetry, and nothing to pay for.

**What it does**

- Reads the platforms you turn on, on a rhythm set per platform.
- Discards what does not fit **and tells you why** — a rejected offer is not
  deleted, it is filed with its reason, so you can audit the filter instead of
  trusting it.
- Learns nothing about you that you did not type. Your profile is a row in your
  own database.
- Emails you only when something worth reading shows up (optional).
- Shows what the market is asking for, from the postings it already read, so you
  can see which technology keeps appearing in jobs you cannot take yet.

**What it does not do**

- It does not apply for you. It opens the application with your text filled in,
  and you press send. A robot writing in your name to a person is how you get
  your account flagged, and how you end up in an interview for a job you never
  read about.
- It does not scrape at machine speed. Each platform has a rhythm chosen for what
  is at risk when you read it: a watched account gets three visits a day, an open
  API gets one every thirty minutes.
- It is not a hosted service. There is nothing to sign up for.

## What this project will not trade away

Six rules. They are the reason the code looks the way it does, and a change
that breaks one of them is a change this project does not want, however
convenient it is.

1. **Your data stays yours.** The CV, the profile and the postings live in
   files on your disk. Anything that leaves the machine is opt-in, needs your
   own API key, and is named in [docs/PRIVACY.md](docs/PRIVACY.md).
2. **Nothing is discarded in silence.** A posting that does not fit is stored
   with its reason and shown in the dashboard. A filter that throws good jobs
   away is the most expensive bug here, and it is invisible unless the evidence
   is kept.
3. **The reading pace protects the other side.** What sets the rhythm is what
   is at risk when you read: your account, or someone else's server. Limits are
   not performance tuning and are not raised for convenience.
4. **Anything about you is configured in the app, never in a file.** It is
   stored in the database and applies to the next search. Restarting a service
   to fix a typo is not acceptable.
5. **No platform is special.** Sources are interchangeable implementations
   behind one interface. Deleting the biggest one is a file and a line.
6. **Comments say why, not what.** Most odd-looking rules in the filter name
   the real posting that made them necessary. A fix without its case is not a
   fix anyone can verify later.

How each is enforced: [CONTRIBUTING.md](CONTRIBUTING.md) for the code,
[docs/SOURCES.md](docs/SOURCES.md) for platforms,
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the structure, and
[DESIGN.md](DESIGN.md) for the dashboard.

## Quick start

Requires **Node.js 22+** and about five minutes.

```bash
git clone https://github.com/YOUR_USER/novus-jobs.git
cd novus-jobs

# 1. The dashboard
cd web && npm ci && npm run build && cd ..

# 2. The server
cd server && npm ci && npm run build
cp .env.example .env        # everything in it is optional; defaults work
npm start
```

Open **http://127.0.0.1:47831** and the setup wizard walks you through it:

1. **Your CV.** Upload it and the stack, English level and location are read off
   it — locally, with pattern rules, on your machine. You can skip this and type
   everything by hand.
2. **Your stack.** What you know, which technologies define your trade, and which
   ecosystems you do not want to be offered.
3. **English.** Your level, and whether postings demanding more than that should
   be hidden.
4. **Where.** The country you work from, your time zone, and which arrangements
   you accept — fully remote, remote-in-your-country, hybrid, on-site. The time
   zone matters: search slots are hours on *your* clock, and the dashboard
   prints every date in it.
5. **Platforms.** Which ones to turn on.

Platforms that need a session need one login, once:

```bash
cd server && npm run login -- linkedin
```

A real browser window opens. Log in calmly, solve the captcha if there is one,
and **close the window when you are in** — closing it is what saves the session.

To keep it running after you close the terminal, see
**[docs/INSTALL.md](docs/INSTALL.md)** — macOS, Linux and Windows.

## What it looks like

The dashboard is dark, dense and flat: a tracking tool, not a landing page. Five
screens — what it searched, what it found, what it discarded and why, what the
market is asking for, and the settings.

## Privacy, concretely

| Thing | Where it goes |
|---|---|
| Your CV | A folder on your disk, `0600`. Read locally with pdf.js. |
| Your profile | A row in your SQLite file. |
| Job postings | Same file. |
| Your browser sessions | Your disk, outside the repo, `0600`. |
| Anything to a third party | **Only if you opt in:** the LLM judge sends job postings (not your CV) to Google; the "read my CV with the model" button sends the CV text, and only when you click it. Both need your own API key and both are off without one. |

No analytics, no crash reporting, no update check. The server binds to
`127.0.0.1`. Full detail: **[docs/PRIVACY.md](docs/PRIVACY.md)**.

## Supported platforms

Each one is independent: switch it on or off from the Integrations screen, and
give it its own rhythm. Nothing in the project depends on any single platform.

| Platform | How it is read | Needs a login | Default rhythm |
|---|---|---|---|
| **Get on Board** | Public search API (`/api/v0/search/jobs`), no credentials | No | Every 60 min |
| **LinkedIn** | Your own feed, in a real browser with your session | Yes, once | 3 time slots a day |

Why the rhythms differ: what sets the pace is **what is at risk when you read**.
An open API only needs good manners towards someone else's server; an account
that can be flagged gets a human pace and a hard daily ceiling.

**More are welcome, and this list is meant to grow.** If a board you use is
missing, [open an issue](.github/ISSUE_TEMPLATE/new-source.md) or send a PR —
a source is one file and one line, and boards with a public API or an RSS feed
are the easiest to add. Candidates people have asked for: RemoteOK, We Work
Remotely, InfoJobs, Wellfound, Remotive, Himalayas, Hacker News "Who is hiring".

## Adding a platform

A source is one file and one line in a registry. It declares its name, whether
it needs a browser session, and the rhythm it is safe to read it at; everything
else — the dashboard, the scheduler, the filter, the Integrations screen — picks
it up without changes. Removing one is deleting that file and that line.

```ts
{ name: 'infojobs', label: 'InfoJobs', create: (config, pool) => new InfoJobsSource(config, pool) }
```

Step by step, with the full contract: **[docs/SOURCES.md](docs/SOURCES.md)**.

Nothing in the project depends on any particular platform — not even LinkedIn.
Turning one off is a switch; deleting it is a file and a line.

## Documentation

| | |
|---|---|
| [docs/INSTALL.md](docs/INSTALL.md) | Install, configure, and run it as a service that survives reboots |
| [docs/SOURCES.md](docs/SOURCES.md) | Write a new source, or remove one |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the pieces fit, and why they are split that way |
| [docs/PRIVACY.md](docs/PRIVACY.md) | Every byte that leaves your machine, and what turns it off |
| [DESIGN.md](DESIGN.md) | The design system of the dashboard |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to work on it |

## Status

Used daily by its author since 2026. The filter has been tuned against real
postings, and most of the odd-looking rules in `server/src/filters/` have a
comment naming the posting that made them necessary. Expect that style
throughout: the code explains **why**, not what.

Tests: `cd server && npm test`.

## License

MIT. See [LICENSE](LICENSE).
