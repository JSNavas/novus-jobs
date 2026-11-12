# Writing a source

A **source** is one platform Novus Jobs reads: LinkedIn, Get on Board, a job
board's RSS feed, a company's careers API.

**Most boards need no code at all.** If the platform is a public endpoint that
returns JSON or RSS, write a descriptor instead — one JSON file, no TypeScript,
no rebuild: [DESCRIPTORS.md](DESCRIPTORS.md). This page is for the rest: a
platform that needs a session, a signature, or two requests to answer one
question. Adding one of those is a file and a line. Removing one is deleting
them.

Nothing else in the project knows how many platforms exist or what they are
called. The scheduler, the runner, the filter, the database and the Integrations
screen all work off the registry.

- [Code, or a descriptor?](#code-or-a-descriptor)
- [The contract](#the-contract)
- [A source that reads an API](#a-source-that-reads-an-api)
- [A source that needs a login](#a-source-that-needs-a-login)
- [Choosing a rhythm](#choosing-a-rhythm)
- [Registering it](#registering-it)
- [Removing one](#removing-one)
- [Rules of the house](#rules-of-the-house)

## Code, or a descriptor?

| The platform… | What it takes |
|---|---|
| answers a `GET` with JSON | a descriptor |
| publishes an RSS or Atom feed | a descriptor |
| takes a JSON body on `POST`, like Workday | a descriptor |
| needs you to be logged in | a class, with `profileId` and `loginUrl` |
| needs a signature or a token refreshed | a class |
| needs one request to learn what the next asks for | a class |
| writes the vacancies into its HTML, but publishes `JobPosting` on each one | a descriptor (`"format": "jsonld"`) |
| hides the postings in HTML and publishes nothing structured | a class |

The last three are not arbitrary. `hackernews.source.ts` is a class because the
"Who is hiring" thread has a different id every month: a descriptor with the id
written in it would break on the first of December, silently.

Put differently: a descriptor carries data, a class carries logic. If you find
yourself wishing the descriptor had an `if`, that is the signal.

## The contract

`server/src/sources/types.ts`:

```ts
export interface JobSource {
  /** Stable id. Goes in the database, in JOB_SOURCES and in the login URL. */
  readonly name: string;
  /** What the dashboard shows. */
  readonly label: string;
  /** The address it reads, shown on its Integrations card. null if there is none. */
  readonly endpoint: string | null;
  /** The browser profile it needs, or null if it needs no session. */
  readonly profileId: string | null;
  /** Where to send the user to log in, or null. */
  readonly loginUrl: string | null;
  /** When the scheduler runs it, and how hard it may be pushed. */
  readonly policy: SourcePolicy;

  fetch(selectPermalinks: PermalinkSelector, isFresh?: FreshnessCheck): Promise<RawPost[]>;
  close(): Promise<void>;
}
```

`fetch` returns raw postings. It does **not** decide whether a posting is any
good — that is the filter's job, and keeping the two apart is what lets one
filter serve every platform:

```ts
export interface RawPost {
  text: string;                 // the whole posting, as written
  author: string | null;        // who published it
  url: string | null;
  metrics?: PostMetrics;        // posted date, applicant count, if available
}
```

`selectPermalinks` exists for platforms where fetching a posting's permanent URL
costs an extra request. The pipeline hands you the indices worth paying for —
the ones that would survive the filter — so you do not spend a request on a
posting that is about to be discarded.

## A source that reads an API

The simplest kind: no browser, no session, no account to protect.

```ts
// server/src/sources/remoteok.source.ts
import { OPEN_API_POLICY } from './policy.js';
import type { JobSource, PermalinkSelector, RawPost } from './types.js';

export class RemoteOkSource implements JobSource {
  readonly name = 'remoteok';
  readonly label = 'RemoteOK';
  readonly profileId = null;   // no browser
  readonly loginUrl = null;    // no session
  readonly policy = OPEN_API_POLICY;

  async fetch(_select: PermalinkSelector): Promise<RawPost[]> {
    const response = await fetch('https://remoteok.com/api');
    if (!response.ok) throw new Error(`RemoteOK responded ${response.status}`);
    const jobs = (await response.json()) as RemoteOkJob[];
    return jobs.filter((job) => job.description).map((job) => ({
      text: `${job.position}\n${job.company}\n${job.description}`,
      author: job.company ?? null,
      url: job.url ?? null,
      metrics: { postedAt: job.date ?? null, applications: null, responseDays: null },
    }));
  }

  async close(): Promise<void> {}
}
```

Throw on failure; do not return an empty array. An empty array means "read fine,
nothing new", and the dashboard will tell the user everything is well. The
runner classifies thrown errors into reasons it can act on — see
`sources/failure.ts`.

## A source that needs a login

Ask the pool for a browser profile and declare the two session fields:

```ts
export class SomeBoardSource implements JobSource {
  readonly name = 'someboard';
  readonly label = 'Some Board';
  readonly profileId = 'someboard';                    // its own browser profile
  readonly loginUrl = 'https://someboard.com/login';   // where `npm run login` sends you
  readonly policy = WATCHED_ACCOUNT_POLICY;

  constructor(private readonly config: Config, private readonly pool: BrowserPool) {}

  async fetch(select: PermalinkSelector): Promise<RawPost[]> {
    const session = this.pool.session(this.profileId);
    const context = await session.context();
    // ... drive the page, read postings, return them
  }
}
```

With `profileId` set, `npm run login -- someboard` works with no further
changes, and so does the pause-searches-while-logging-in dance.

**If the page shows you a login wall, say so.** Throw the login-wall error from
`sources/types.ts` instead of returning nothing: the runner then refuses to
retry that platform until the user logs in again, because repeatedly loading a
login page with an automated browser is what gets an account flagged.

## Choosing a rhythm

The rhythm is not about the platform, it is about **what is at risk when you
read it**. There are two policies in `sources/policy.ts` and a new source picks
the one that matches its nature rather than writing a third:

| | `WATCHED_ACCOUNT_POLICY` | `OPEN_API_POLICY` |
|---|---|---|
| For | Anything read through your logged-in account | Public endpoints, RSS, open APIs |
| At stake | Your account | Someone else's server |
| Scheduled | Time slots (default 9, 13, 18) | Every N minutes |
| Manual floor | 1 hour between manual searches | 1 minute |
| Hard daily ceiling | 20 reads | none |

The user can change the numbers from the Integrations screen, but not the
**shape**: a slot-based platform cannot be turned into "every 5 minutes" from
the UI. That protection used to come from the values being in code, and it
survives the move to the database on purpose.

## Registering it

One entry in `server/src/sources/registry.ts`:

```ts
const DEFINITIONS: readonly SourceDefinition[] = [
  { name: 'linkedin', label: 'LinkedIn', create: (config, pool) => new LinkedInSource(config, pool) },
  { name: 'getonbrd', label: 'Get on Board', create: () => new GetOnBoardSource() },
  { name: 'remoteok', label: 'RemoteOK', create: () => new RemoteOkSource() },   // ← new
];
```

That is the whole integration. It appears in Integrations **switched off**, with
the right editor for its schedule, and the user turns it on. Every source the
project knows is constructed at startup — constructing one opens no browser and
makes no request, that happens in `fetch` — because a source that is not
constructed does not exist for the UI, and then there would be nowhere to turn
it back on.

Postings are already stored with the platform they came from, so the dashboard,
the per-platform search history and the rhythm accounting work immediately.

## Removing one

Delete `server/src/sources/<name>.source.ts` and its line in the registry.
Nothing else names it. Postings it already found stay in the database with their
`source` column, which is what you want — the history of your own job hunt
should not disappear because you dropped a platform.

To stop using one without deleting it, use the switch in Integrations.

## Rules of the house

- **Prefer a descriptor.** A class is a maintenance promise from whoever merges
  it. A descriptor is a file anyone can fix, share or delete, and it needs no
  release to reach the person who needs it.
- **One filter, every platform.** A source returns text. It does not decide what
  fits the user; `filters/` does, from the user's profile. A source that filters
  is a second set of rules nobody can audit from the dashboard.
- **Never pretend a failure is an empty read.** `fetched: 0` with a green status
  tells the user all is well while their account is logged out.
- **Respect the other side.** The ceilings exist for accounts you can lose and
  servers that are not yours. If a new platform needs a gentler rhythm than both
  policies, add a third one and name it after what it protects.
- **Stop early when there is nothing new.** `fetch` gets an optional
  `isFresh(text)`. A source that pages through results should stop as soon as a
  whole page is already known: re-downloading what you will throw away costs
  someone else's bandwidth and makes the dashboard claim work it did not do.
- **Say why in a test.** The code carries no comments, so a rule that looks
  wrong is explained by the test beside it, named after the real case that made
  it necessary. The next person needs the reason, not a restatement of the code.
