# Contributing

Thanks for looking. This is a small project with a strong opinion about how it
is written, so this page is mostly about that opinion.

## Getting set up

```bash
cd web && npm ci && npm run build && cd ../server && npm ci && npm test
```

Node 22+. No other services needed — the database is a file.

For development, point `DATA_DIR` at a scratch directory so your experiments
never touch a real job hunt:

```bash
DATA_DIR=/tmp/novus-dev PORT=47999 SCHEDULER_ENABLED=false npm start
```

## Before you open a PR

- `npm test` passes (`cd server`).
- `npx tsc --noEmit` is clean in both `server/` and `web/`.
- No new dependency unless it earns its place — the whole server runs on five.

## How this code is written

**The code carries no comments, so the tests have to explain it.** The hardest
part of a job filter is not the code, it is knowing why a rule that looks wrong
is right. Here that lives in the test next to it, named after the actual
posting that made the rule necessary. Keep that up: if you fix a filter bug,
the case goes in as a test with a name that says what happened.

**A filter fix comes with its posting as a test.** That is how the filter stays
trustworthy. Tests here are mostly real cases, not invented ones.

**Nothing silently discards.** Every rejection is stored with its reason and
shown in the dashboard. A rule that throws good jobs away without leaving
evidence is the most expensive bug this project can have, and the only defence
is that it leaves evidence.

**Respect the other side's servers and the user's account.** Rhythm limits are
not performance tuning, they are what keeps an account alive. If you change one,
say what it protects.

**Settings that a user may want to correct do not live in `.env`.** They live in
the database and apply on the next pass. Restarting a service to fix a typo is
not acceptable here.

**The dashboard follows [DESIGN.md](DESIGN.md).** Dark, flat, dense, no shadows,
and every empty state explains why it is empty.

## Good first contributions

- **A new source.** The highest-value contribution: more platforms is the thing
  users want most. See [docs/SOURCES.md](docs/SOURCES.md) — it is one file and
  one line.
- **More countries and cities** in `server/src/filters/countries.ts`. The
  location rules only work as well as that dataset, and it currently leans
  heavily towards Latin America, Spain and a handful of others. If your country
  is missing, adding it is a small, high-impact PR.
- **More technologies** in `server/src/profile/technologies.ts`, which is what
  the CV reader recognises.
- **Translations.** The UI is in Spanish today. It was written for one person
  and now it is not; an i18n pass is wanted.

## Reporting a bug

Say what you expected, what happened, and — if it is about the filter — paste
the posting. Without the posting there is nothing to test against.

Please do not paste your CV or anything with your personal details into an
issue.
