# Architecture

Two packages, one process, one file of data.

```
server/   Node + Fastify + SQLite. Searches, filters, serves the API and the UI.
web/      React + MUI, built to static files that the server serves itself.
```

There is no second process, no queue, no container and no external database.
That is a deliberate ceiling: this runs on a laptop that sleeps, and every piece
of infrastructure you add is a piece that can be broken when the laptop wakes up.

## The flow of one search

```
Scheduler (tick every 5 min)
   │  is it this platform's turn? is it switched on?
   ▼
Runner ─── one pass at a time, one row in `runs` per platform
   │
   ▼
Source.fetch() ──────────────► raw postings
   │
   ▼
Filter (filters/decide.ts) ─── your profile decides: location, language,
   │                           vetoed technology, core stack
   │   accepted + "uncertain"
   ▼
LLM judge (optional) ───────── can reject what rules let in, and overturn
   │                           certain rejections. Never invents a veto.
   ▼
JobsRepository.insert() ────── deduplicated by text fingerprint
   │
   ▼
Mailer (optional) + Dashboard
```

**Rejections are stored, not dropped.** A posting that does not fit is saved
with the reason and the family of rule that rejected it. The *Discarded by the
filter* screen exists so you can audit the filter instead of trusting it — the
most expensive bug in a tool like this is a rule that silently throws away good
jobs, and such a bug is invisible by definition unless you keep the evidence.

## Where things live

| Concern | Where |
|---|---|
| Composition root | `server/src/index.ts` — the only place that wires everything |
| HTTP | `server/src/app.ts` and `server/src/routes/` |
| The decision | `server/src/filters/` |
| Your profile | `server/src/profile/` |
| Reading a CV | `server/src/cv/` |
| Platforms | `server/src/sources/` |
| — a platform written as data | `descriptor.ts`, `described.source.ts`, `descriptors.ts` |
| — the shipped catalogue | `server/descriptors/*.json` |
| — finding a board from a name or a URL | `discover.ts`, `sniff.ts`, `joblike.ts` |
| — reading a board that only has pages | `jsonld.ts`, `reader.ts` |
| — writing the mapping with an LLM | `invent.ts` |
| Scheduling | `server/src/scheduler/` |
| Persistence | `server/src/db/` |
| Market analysis | `server/src/analysis/` |
| Dashboard | `web/src/views/`, with shared components in `web/src/components/ui/` |

## Eight decisions worth knowing

### The profile is data, not code

Your stack, your English level, your country and which arrangements you accept
live in the database and are read **at the start of every pass**. Not cached,
not injected once at boot: fixing a technology in your profile has to affect the
next search, and nobody should have to restart a service to correct a typo.

The same applies to the per-platform schedule and the on/off switch. The only
things in `.env` are the ones where a restart is acceptable because they are
infrastructure: ports, paths, API keys.

### Nothing depends on a specific platform

The filter never asks "is this LinkedIn?". Sources are a registry of
interchangeable implementations behind one interface, with a rhythm chosen by
what is at risk when you read them. See [SOURCES.md](SOURCES.md).

### Most platforms are data, not classes

Taken to its conclusion: if no platform is special, no platform needs to be
written in the code. Eight of the eleven that ship are JSON descriptors
(`server/descriptors/`), and users add their own from the app, stored in
`settings`. One class, `DescribedSource`, satisfies the port for all of them.

This works because a posting travels as **text**: the rules read prose and so
does the LLM judge, so four fields — title, company, description, link — produce
something the pipeline evaluates exactly like a LinkedIn post. An incomplete
mapping degrades, it does not corrupt.

A class is still right when there is *logic*: a session to keep, a signature to
compute, or two requests to answer one question. `hackernews.source.ts` is the
example — the "Who is hiring" thread has a different id every month.

### The LLM writes the adapter, never the posting

Adding a source calls the model **once**, to turn a sample response into a
mapping. That mapping is saved as data and the model is never called again for
that source: the next ten thousand postings are extracted by `DescribedSource`,
deterministically and for free.

The same line runs through the judge, which reads postings but cannot overrule
the stack, a named country, or a rule that never got to run. An LLM in this
project proposes structure and opinion; it is never the thing between you and
your data.

### A standard beats a selector

A board with no API tempts you into CSS selectors, and a selector is a promise
you cannot keep: it breaks the week they redesign, silently, one board at a
time. So the project does not parse markup.

What it reads instead is `JobPosting` in JSON-LD — the structure a site must
publish to appear in Google's job search. The incentive is the point: the board
maintains that data because its own traffic depends on it, which makes it the
most durable thing on the page. Being a standard, the field mapping is known in
advance, so a descriptor for such a board has an empty `fields`.

The same reasoning draws the line at the bot wall. When a site answers only to a
real browser window, the reader says so and opens one, rather than pretending
the board published nothing.

### Discard reasons travel as codes, not sentences

The filter stores both: the sentence (emails read it, and so do postings saved
before this existed) and a code with its parameters — `reject.english`,
`{demanded: 'C1', yours: 'B1'}`. The dashboard writes the sentence itself, in
the reader's language.

It used to be a sentence only, and the UI classified it with regular
expressions over the Spanish text. Rewording one reason silently broke its
badge, and no test failed. A code cannot rot like that.

### A rejected posting is kept, with its reason

Nothing is deleted. A posting the filter turns down is stored like any other,
with its code, its parameters and the location the rules read off it. The
dashboard has a screen for them.

This costs disk and it is the most valuable thing in the schema. Reading all
956 stored postings against the rules, one by one, found four bugs that no test
covered and that no amount of reading the code would have surfaced: a marker
*this project writes itself* (`Hilo:`, from the Hacker News adapter) was listed
among the "this is content, not a job" marks, and it was quietly discarding 169
of 188 posts from that source. The others were of the same shape — a signal that
looked strong and was not: `REMOTE (US)` read as worldwide, and 23 of 24 vetoes
on `go` that were the English verb (*"what can go wrong"*).

A filter you can only trust is a filter you cannot fix. The reason each posting
was turned down is the audit trail that makes the rules correctable.

### Enums have no CHECK constraints

Deliberate. A `CHECK (x IN (...))`
generated from a TypeScript enum freezes the list of values in the databases of
everyone who already installed the project, because `CREATE TABLE IF NOT EXISTS`
does not touch an existing table. Then a new enum value works in a fresh install
and fails in theirs — which is exactly what happened when `venezuela` became
`home_country`. TypeScript validates the values, and it is the same TypeScript
everywhere.

Migrations in `db/database.ts` follow from that: additive, idempotent, run on
every startup, never destructive.

## The data

One SQLite file, three tables:

- **`jobs`** — every posting read, accepted or rejected, with its verdict, its
  reason, where it can be worked from and which of your technologies it matched.
- **`runs`** — one row per platform per pass: when, how many read, how many
  kept, and the failure if there was one.
- **`settings`** — key/value. Your profile is one JSON row here, and so is each
  platform's schedule and switch. Key/value and not a column per setting, so
  that adding a setting never needs a migration.

Browser sessions live outside all of this, in `~/.novus-jobs/browser-profiles/`,
because they are the only thing in the project that cannot be regenerated.

## Testing

`cd server && npm test` — the Node built-in runner over the compiled output.

The suite is mostly **real cases**: a posting that slipped through, a rejection
that should not have happened, a rhythm that could have burned an account. Many
tests name the date and the posting that motivated them. When you fix a filter
bug, the posting that exposed it belongs in a test — that is how the filter has
stayed trustworthy.

The frontend has no test suite. It is thin by design: fetch, render, and let the
server make every decision.
