import type { JobsRepository, NewJob } from './db/jobs.repository.js';
import type { RunOutcome } from './db/runs.repository.js';
import { decideShipping, fingerprint, locationLabel, storedText, type CandidateProfile, type Offer, type Verdict } from './filters/decide.js';
import { companyName, offerTitle, roleOnly, stripAuthorHeaders } from './filters/headline.js';
import type { LlmJudge, JudgeVerdict } from './filters/judge.js';
import { classifyFailure, failureMessage, worstFailure } from './sources/failure.js';
import type { JobSource, RawPost } from './sources/types.js';
import { JobSeniority, JudgeStatus, JobVerdict, type RunFailure } from './types.js';

interface PipelineDeps {
  jobs: JobsRepository;
  judge: LlmJudge | null;
  profile: CandidateProfile;
  /** La pasada en curso. Queda grabada en cada oferta para poder volver a ella. */
  runId: number;
}

export interface SourceFailure {
  source: string;
  message: string;
  kind: RunFailure;
}

export interface PassResult {
  outcome: RunOutcome;
  /** Las que se guardaron AHORA y encajan. Es lo que se avisa por correo. */
  accepted: NewJob[];
  failures: SourceFailure[];
  /** El motivo que mandará en el registro de la pasada, si hubo alguno. */
  worst: RunFailure | null;
}

/**
 * Una pasada completa: fuente → descartar lo ya visto → reglas → juez → guardar.
 * Se guardan también los descartes con su motivo: una oferta buena descartada
 * por error es la que nadie vería, y el registro permite auditar el criterio.
 *
 * CADA PLATAFORMA FALLA SOLA. Las fuentes se recorren en serie y una que explota
 * no se lleva por delante a las demás: con LinkedIn sin sesión, InfoJobs tiene
 * que entregar sus ofertas igual. Antes la primera excepción abortaba la pasada
 * entera, que con una sola fuente da lo mismo y con tres es una pérdida tonta.
 *
 * En serie y no en paralelo, también a propósito: en paralelo serían N Chromium
 * a la vez y N plataformas viendo actividad simultánea desde la misma máquina.
 */
export async function runPasses(sources: readonly JobSource[], deps: PipelineDeps): Promise<PassResult> {
  const total: RunOutcome = { fetched: 0, accepted: 0, rejected: 0 };
  const accepted: NewJob[] = [];
  const failures: SourceFailure[] = [];
  for (const source of sources) {
    try {
      const { outcome, fresh } = await runSource(source, deps);
      accepted.push(...fresh);
      total.fetched += outcome.fetched;
      total.accepted += outcome.accepted;
      total.rejected += outcome.rejected;
    } catch (error) {
      const kind = classifyFailure(error);
      failures.push({ source: source.name, message: failureMessage(error), kind });
      console.warn(`[${source.name}] la pasada falló (${kind}): ${failureMessage(error)}`);
    }
  }
  return {
    outcome: total,
    accepted,
    failures,
    worst: failures.length ? worstFailure(failures.map((f) => f.kind)) : null,
  };
}

async function runSource(source: JobSource, deps: PipelineDeps): Promise<{ outcome: RunOutcome; fresh: NewJob[] }> {
  const seen = deps.jobs.fingerprintsOf(source.name);
  const isFresh = (text: string) => !seen.has(fingerprint(text));
  const posts = await source.fetch((list) => indicesToFetchPermalink(list, deps.profile, isFresh));
  const offers: Offer[] = posts.map(toOffer);
  const fresh = offers.filter((o) => isFresh(o.text));
  const judged = await judgeAccepted(fresh, deps);

  const outcome: RunOutcome = { fetched: posts.length, accepted: 0, rejected: 0 };
  const stored: NewJob[] = [];
  for (const offer of fresh) {
    const ruleVerdict = decideShipping(offer, deps.profile);
    const judgment = judged.get(fingerprint(offer.text));
    const verdict = applyJudgment(ruleVerdict, judgment);
    const job = toNewJob(source.name, offer, ruleVerdict, verdict, judgment ? JudgeStatus.Judged : JudgeStatus.Skipped, deps.runId);
    if (!deps.jobs.insert(job)) continue;
    if (verdict.accepted) {
      outcome.accepted++;
      stored.push(job);
    } else {
      outcome.rejected++;
    }
  }
  return { outcome, fresh: stored };
}

/** Solo se pide el permalink de lo que ya encaja por reglas y no se ha visto. */
function indicesToFetchPermalink(posts: readonly RawPost[], profile: CandidateProfile, isFresh: (text: string) => boolean): number[] {
  return posts.flatMap((post, index) => {
    const wanted = isFresh(post.text) && decideShipping(toOffer(post), profile).accepted;
    return wanted ? [index] : [];
  });
}

function toOffer(post: RawPost): Offer {
  return { text: post.text, url: post.url, author: post.author };
}

/**
 * El juez solo ve lo que las reglas aceptaron y solo puede VETAR o afinar. Si
 * no hay clave o falla, el mapa sale vacío y mandan las reglas.
 */
async function judgeAccepted(fresh: readonly Offer[], deps: PipelineDeps): Promise<Map<string, JudgeVerdict>> {
  const candidates = fresh.filter((o) => decideShipping(o, deps.profile).accepted);
  const verdicts = candidates.length && deps.judge
    ? await deps.judge.judge(candidates, deps.profile).catch(() => null)
    : null;
  const byFingerprint = new Map<string, JudgeVerdict>();
  for (const v of verdicts ?? []) {
    const offer = candidates[v.index];
    if (offer) byFingerprint.set(fingerprint(offer.text), v);
  }
  return byFingerprint;
}

function applyJudgment(rules: Verdict, judgment: JudgeVerdict | undefined): Verdict {
  if (!judgment || !rules.accepted) return rules;
  if (!judgment.isOffer || judgment.rejection) {
    return { ...rules, accepted: false, reason: `[IA] ${judgment.reason || judgment.rejection || 'no es una oferta'}` };
  }
  return {
    ...rules,
    seniority: judgment.junior ? JobSeniority.Junior : rules.seniority,
    aggregator: judgment.aggregator || rules.aggregator,
  };
}

function toNewJob(
  source: string,
  offer: Offer,
  rules: Verdict,
  verdict: Verdict,
  judgeStatus: JudgeStatus,
  runId: number,
): NewJob {
  // El anuncio SIN la firma de quien publica: de ahí salen el título y la
  // empresa, y es también lo que se guarda para leer. Con la cabecera delante,
  // la tarjeta empezaba por "Fulano • 2o Recruiter | Talent…" y había que
  // abrirla para saber de qué iba.
  const ad = stripAuthorHeaders(offer.text);
  return {
    source,
    fingerprint: fingerprint(offer.text),
    title: offerTitle(ad),
    role: roleOnly(offerTitle(ad)),
    company: companyName(ad),
    author: offer.author ?? null,
    text: storedText(ad),
    url: offer.url,
    location: locationLabel(rules.location, rules.reason),
    locationKind: rules.location,
    verdict: verdict.accepted ? JobVerdict.Accepted : JobVerdict.Rejected,
    rejectionReason: verdict.accepted ? null : verdict.reason,
    seniority: verdict.seniority,
    isAggregator: verdict.aggregator,
    isUncertain: verdict.uncertain,
    judgeStatus,
    stackMatch: verdict.stackMatch,
    applyUrl: verdict.applyUrl,
    contactEmail: verdict.contactEmail,
    postedAt: null,
    runId,
  };
}
