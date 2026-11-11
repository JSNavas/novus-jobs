# Privacy

The point of this project is that your job hunt stays yours. This page lists
every byte that can leave your machine, and what turns it off.

## By default, nothing leaves

Out of the box — no API keys configured — Novus Jobs talks to exactly one kind
of outside party: **the job platforms you turned on**, to read their postings.
That is the whole network footprint. There is no analytics, no crash reporting,
no update check, no license check, no phoning home.

The server binds to `127.0.0.1`. It is not reachable from your network, which is
also why it has no login screen: the security boundary is your machine, not a
password.

## Where your things are

| | Location | Notes |
|---|---|---|
| Your CV | `<DATA_DIR>/cv/`, mode `0600` | Text is extracted locally with pdf.js |
| Your profile | A row in `<DATA_DIR>/jobs.db` | Stack, English level, country, preferences |
| Postings found | Same file | Including the rejected ones, with their reason |
| Your applications | Nowhere — the app opens a draft and you send it | |
| Browser sessions | `~/.novus-jobs/browser-profiles/`, mode `0600` | Worth as much as your password |

Delete the data directory and nothing of you is left.

## The two things that can send data out

Both are opt-in, both need **your own** Google API key, and both are inert
without one.

### 1. The LLM judge — sends job postings

If `GEMINI_API_KEY` is set, each pass sends the **text of the job postings** it
read to Google's Gemini API, in batches, to act as a second pair of eyes over
the rules. These are public job ads, not your data — but they are a request to a
third party, and the fact that you are reading jobs at a given time is itself
information.

Your profile is summarised in the instruction (the technologies you do not work
with, so the model can judge a posting against them). Your name, your CV and
your email are never part of it.

**To turn it off:** remove `GEMINI_API_KEY`. The rules decide alone; the app
works fully.

### 2. "Read my CV with the model" — sends your CV text

During setup there is a switch that sends the **text of your CV** to the same
API, to extract skills that the local rules could not recognise. It is off by
default, it is a single click that you make, and the screen says plainly what it
does before you make it.

Without it, the CV is read entirely on your machine with pattern rules against a
catalogue of technologies. That reads less, and what it misses you type by hand.

**To turn it off:** do not switch it on. Without `GEMINI_API_KEY` the switch is
not even offered.

## Email notifications

If you configure Resend (`RESEND_API_KEY`, `MAIL_FROM`, `MAIL_TO`), the app
sends **you** an email when a pass finds something, containing the postings'
titles and links. That goes through Resend's servers like any email. Leave those
variables empty and no mail is ever sent.

## What the platforms see

They see a browser reading their pages, from your IP, with your session — the
same things they would see if you read them yourself. The per-platform rhythm
exists for this reason: three visits a day to a watched account looks like a
person, and thirty does not.

Novus Jobs does not create accounts, does not post, does not message anyone and
does not apply on your behalf. Everything it does on a platform, it does
read-only.

## What this does not protect you from

- **Your own network.** If you read a job board over a network that logs
  traffic, that is outside this tool.
- **Platform terms of service.** Automating reads of a site you have an account
  on may be against its rules. That is your decision to make; the project does
  not pretend otherwise.
- **Anyone with access to your machine.** The database is unencrypted and the
  dashboard has no password. It is a local file, with the same protection as
  the rest of your files.
