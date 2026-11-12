# Describing a source with JSON

Most job boards are the same thing wearing different names: a `GET` that
returns JSON with a list of postings in it. For those, Novus Jobs does not need
a class — it needs to be told where the title lives.

A **descriptor** is that: one JSON file that turns a public endpoint into a
source. It is read at startup, it satisfies the same `JobSource` contract as
LinkedIn, and the filter cannot tell the difference.

```json
{
  "version": 1,
  "name": "remotive",
  "label": "Remotive",
  "homepage": "https://remotive.com",
  "request": {
    "url": "https://remotive.com/api/remote-jobs",
    "query": { "limit": "100" }
  },
  "fields": {
    "list": "jobs",
    "title": "title",
    "company": "company_name",
    "description": "description",
    "url": "url",
    "location": "candidate_required_location",
    "postedAt": "publication_date"
  }
}
```

Drop that in `server/descriptors/` and Remotive is a platform: it shows up in
Integrations with its own switch and its own rhythm.

- [You do not have to write one](#you-do-not-have-to-write-one)
- [Why this exists](#why-this-exists)
- [Where descriptors live](#where-descriptors-live)
- [The fields](#the-fields)
- [Reading a feed instead of JSON](#reading-a-feed-instead-of-json)
- [When the page carries the postings inside it](#when-the-page-carries-the-postings-inside-it)
- [When the title carries the company](#when-the-title-carries-the-company)
- [When the API gives no link](#when-the-api-gives-no-link)
- [A company with nothing open](#a-company-with-nothing-open)
- [What a descriptor cannot do](#what-a-descriptor-cannot-do)
- [Recipes: a company's own board](#recipes-a-companys-own-board)
- [Sharing one](#sharing-one)

## You do not have to write one

**Integrations → Add source** does this for you, and the rest of this page is
what it produces. It is worth knowing how it hunts, because that tells you what
to type:

1. **A company name** — nine boards are tried with the usual spellings: Lever,
   Greenhouse, Ashby, Recruitee, Workable, SmartRecruiters, Breezy, Teamtailor
   and Personio. Typing `Duolingo` finds its Greenhouse board with 61 openings.
   If it is on none of them, you are told so and that is the end of it.
2. **Any address** — the page is opened and read for the API behind it, a linked
   RSS feed, the usual same-origin guesses (`/api/jobs` and friends), addresses
   named in its own JavaScript, and postings carried inside the HTML.
3. **A real browser** — if the page gives nothing away, it is loaded in
   Chromium and every request it makes is watched, which is what a person does
   with F12 → Network. This is how Remote Latinos was integrated: its backend
   address appears nowhere in what the site serves, only at runtime.

A list of objects is not a list of postings. Each candidate is scored on its
fields and its address: a title-ish key, a long text body, pay, location, a
job-ish path. Remote Latinos answered with 789 skills and 15 postings — by size
the skills win, by score they are not even offered.

Then the model writes the mapping **once**, from a trimmed sample, and it is
saved as data. The next ten thousand postings are read with no LLM and no cost.
That division is the point: the AI writes the adapter, it never extracts a job.

## Why this exists

An aggregator runs on someone's server, so it can only read boards big enough to
be worth the maintenance, and it gets rate-limited or blocked for everybody at
once. Novus Jobs runs on your machine, with your IP and your rhythm. That makes
the long tail possible: your university's job board, the careers endpoint of one
bank, the Greenhouse page of the company you want to work at.

What was missing was a way to add one without writing TypeScript. The filter
already treats a posting as prose — rules read the text and the LLM judge reads
the text — so a source does not need a perfect field mapping to be useful. Four
fields are enough for a posting the rest of the pipeline can evaluate exactly
like one from LinkedIn.

## Where descriptors live

| Place | What it is | Who writes it |
|---|---|---|
| `server/descriptors/*.json` | the catalogue that ships with the project | pull requests |
| the `settings` table | the ones a user adds on their own machine | the user |

Both are loaded at startup and merged. A descriptor that fails to parse is
skipped with its reason on the log and the others keep working — one broken file
never costs you the whole catalogue. A descriptor cannot take the name of a
source written in TypeScript; that name wins and the descriptor is ignored.

## The fields

### `request`

| Key | Default | What it does |
|---|---|---|
| `url` | required | Must be `https` (or `localhost`, to try things out) |
| `method` | `"GET"` | `"POST"` for endpoints that take a query body, like Workday |
| `format` | `"json"` | `"rss"` for a feed, `"embedded"` for postings carried inside an HTML page |
| `headers` | `{}` | Sent on every request |
| `query` | `{}` | Query string sent on every page |
| `body` | — | JSON body; only with `POST` |
| `paging.param` | — | The query parameter that carries the page number |
| `paging.start` | `1` | `0` for APIs that count pages from zero |
| `paging.max` | `3` | How many pages at most. The project caps this at 20 |
| `paging.totalPages` | — | Where the response says how many pages there are |

### `fields`

Every field but `list` and `skip` takes either one path or a list of them, and
the first one that holds something wins — so a descriptor survives a renamed
key without anyone rewriting it. Paths are dotted:
`company.data.attributes.name`.

| Key | Required | What it is |
|---|---|---|
| `list` | — | Where the array of postings is. `null` means the response *is* the array |
| `skip` | `0` | Entries to drop off the front. Remote OK puts a legal notice there |
| `title` | yes* | The job title |
| `description` | yes | The body of the ad. HTML is flattened to text |
| `company` | — | Who is hiring |
| `url` | — | Where to apply |
| `urlTemplate` | — | Build the link from the entry when the API gives none: `https://site/jobs/{_id}` |
| `location` | — | Printed as `Ubicación:` above the ad |
| `postedAt` | — | ISO text, or epoch seconds or milliseconds |
| `salary` | — | Printed as `Sueldo:` |
| `applications` | — | How many people applied, when the board says |
| `titleFromDescription` | `false` | Use the first line of the body as the title |
| `companySeparator` | — | Split the title on this to get the company |

\* unless `titleFromDescription` is on.

`urlTemplate` fills `{path}` with the same dotted paths as everything else. If
any placeholder comes out empty the link is dropped rather than half-built,
because a link to an error page is worse than no link. `url` wins when both are
set, so a template is a fallback for the entries that lack one.

An entry with no title or no description is dropped rather than stored as an
empty posting. A pass that produces nothing usable fails loudly with the URL in
the message, because a source that silently returns zero looks exactly like a
quiet job market.

## Reading a feed instead of JSON

With `"format": "rss"` each `<item>` (or Atom `<entry>`) becomes a flat object
whose keys are the tag names **in lowercase**, so the same field paths work.
Escaped HTML inside `<description>` is decoded and then flattened.

```json
{
  "version": 1,
  "name": "weworkremotely",
  "label": "We Work Remotely",
  "request": {
    "url": "https://weworkremotely.com/categories/remote-programming-jobs.rss",
    "format": "rss"
  },
  "fields": {
    "list": null,
    "title": "title",
    "description": "description",
    "url": ["link", "guid"],
    "location": "region",
    "postedAt": "pubdate",
    "companySeparator": ":"
  }
}
```

## When the API gives no link

Many in-house APIs return an id and nothing else, because their own front end
knows how to build the URL. `urlTemplate` does the same:

```json
"urlTemplate": "https://app.remotelatinos.com/jobs/{_id}"
```

The braces take the same dotted paths as every other field. If any placeholder
comes out empty the link is dropped rather than half-built — a link to an error
page is worse than no link at all. A real `url` field always wins over the
template.

## A company with nothing open

`"allowEmpty": true` says this board is often empty on purpose. Without it, a
pass that finds nothing fails loudly, which is right for a job board and wrong
for one company: TLNT Group ships with the flag because a month with no
openings is not a broken source.

Leave it off for a real board. A board that answers with nothing has changed or
broken, and dressing that up as a quiet job market is the one thing this project
refuses to do.

## When the title carries the company

Plenty of boards have no company field and write `Acme: Backend Engineer` or
`Acme | Backend Engineer` in the title. `companySeparator` splits it. A real
company field always wins over the separator, so adding one is safe.

This matters beyond looks: the motivation template fills `{empresa}`, and
"I would love to work at Acme: Backend Engineer" is worse than saying nothing.

## What a descriptor cannot do

Be honest about the edge, so nobody debugs a wall:

- **Sign requests, refresh a token, or drive a browser.** Those need a class.
- **Chain requests.** If you must read one endpoint to learn the id for the
  next, that is a class. Hacker News is the example: the "Who is hiring" thread
  has a different id every month, so `hackernews.source.ts` resolves it first.
- **Paginate by offset.** Paging is by page number today. A board that counts
  in rows gets one page until that changes.
- **Parse HTML pages.** JSON, RSS, and JSON carried inside a page. Markup is
  never parsed.

The dividing line is the one the project already draws: a descriptor covers the
boring case, and anything with logic in it earns a class and a test.

## When the page carries the postings inside it

Plenty of boards render in the browser but still ship their data as JSON inside
the HTML — Remix, Next, Nuxt and friends all do it to hydrate the page. With
`"format": "embedded"` the page is fetched and the largest array of objects in
any JSON blob it contains becomes the list, so `"list"` stays `null` and the
field paths work as usual.

This is not HTML scraping: no markup is parsed, and the data is the same object
the site's own code reads. It breaks when the site changes its data shape, which
is the same thing that breaks a plain API descriptor.

Reach for it only when there is no endpoint. Interfell is the example in the
shipped catalogue: its board is served by Simera, whose data route answers 403
to anyone outside the page, while the page itself carries all 25 postings.

## Recipes: a company's own board

Most companies do not write their careers page: they rent an ATS, and the big
ones all answer a public `GET` with JSON. So "watch the company I want to work
at" is a descriptor, not a project. Swap `COMPANY` for the slug in their board
URL — all three were checked against live boards on 12 Nov 2026.

| ATS | Their board looks like | The endpoint | The list |
|---|---|---|---|
| **Lever** | `jobs.lever.co/COMPANY` | `https://api.lever.co/v0/postings/COMPANY?mode=json` | the response itself (`"list": null`) |
| **Greenhouse** | `boards.greenhouse.io/COMPANY` | `https://boards-api.greenhouse.io/v1/boards/COMPANY/jobs?content=true` | `jobs` |
| **Ashby** | `jobs.ashbyhq.com/COMPANY` | `https://api.ashbyhq.com/posting-api/job-board/COMPANY` | `jobs` |

The field names, measured:

| | Lever | Greenhouse | Ashby |
|---|---|---|---|
| title | `text` | `title` | `title` |
| description | `descriptionPlain` | `content` (HTML) | `descriptionPlain` |
| url | `hostedUrl` | `absolute_url` | `jobUrl` |
| location | `categories.location` | `location.name` | `location` |
| posted | `createdAt` | `first_published` | `publishedAt` |

**Use `"allowEmpty": true` for a single company.** A job board with nothing in it
is broken; a company with no openings this month is normal, and without the flag
every pass would be logged as a failure. Keep the flag off for a real board —
that is the rule about never dressing a failure as an empty read.

## Sharing one

A descriptor is data, so it travels. Paste one in an issue, commit one to
`server/descriptors/`, send one to a colleague who job-hunts in your country.
That is the point: the catalogue of boards this project can read should not be
limited to what one maintainer had time to write.

If you add a board to the shipped catalogue, check its terms first. Remote OK,
for one, asks that you link back to them.
