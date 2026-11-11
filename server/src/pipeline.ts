import type { JobsRepository, NewJob } from './db/jobs.repository.js';
import type { RunOutcome } from './db/runs.repository.js';
import { decideShipping, fingerprint, locationLabel, storedText, type CandidateProfile, type Offer, type RejectedBy, type Verdict } from './filters/decide.js';
import { companyName, offerTitle, roleOnly, stripAuthorHeaders } from './filters/headline.js';
import type { LlmJudge, JudgeVerdict } from './filters/judge.js';
import { classifyFailure, failureMessage, worstFailure } from './sources/failure.js';
import type { JobSource, PostMetrics, RawPost } from './sources/types.js';
import { JobLocation, JobSeniority, JudgeStatus, JobVerdict, type RunFailure } from './types.js';

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
  const metricsOf = new Map(posts.map((post) => [fingerprint(post.text), post.metrics ?? null]));

  // Lo que ya está guardado también se pone al día. Las postulaciones suben
  // cada día, y una oferta enseñando las que tenía el día que se encontró es
  // peor que no decir nada: parece un dato de hoy.
  for (const post of posts) {
    const huella = fingerprint(post.text);
    if (!post.metrics || isFresh(post.text)) continue;
    deps.jobs.refreshMetrics(source.name, huella, post.metrics);
  }
  const judged = await judgeOffers(fresh, deps);

  const outcome: RunOutcome = { fetched: posts.length, accepted: 0, rejected: 0 };
  const stored: NewJob[] = [];
  for (const offer of fresh) {
    const ruleVerdict = decideShipping(offer, deps.profile);
    const judgment = judged.get(fingerprint(offer.text));
    const verdict = applyJudgment(ruleVerdict, judgment);
    const job = toNewJob(
      source.name,
      offer,
      verdict,
      judgment ? JudgeStatus.Judged : JudgeStatus.Skipped,
      deps.runId,
      metricsOf.get(fingerprint(offer.text)) ?? null,
    );
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
 * Lo descartado por `stack` no se le manda al juez: no se le pregunta por el
 * stack, así que no puede opinar, y mandarlo sería pagar tokens por una
 * respuesta que `applyJudgment` va a ignorar de todas formas.
 */
function isJudgeable(rules: Verdict): boolean {
  return rules.accepted || rules.rejectedBy !== 'stack';
}

/**
 * Al juez se le manda lo que las reglas aceptaron Y lo que descartaron por algo
 * que él sabe leer mejor.
 *
 * Antes solo veía lo aceptado, y eso hacía que un falso descarte de una regex
 * fuera IRRECUPERABLE: la oferta se guardaba descartada con
 * `judge_status = skipped` y nadie la volvía a mirar. Contado sobre el feed
 * real: de 117 descartes, 114 nunca habían pasado por el juez, y de los 117
 * solo 17 eran de `stack` — los otros 100 se tiraban sin segunda opinión
 * pudiendo tenerla.
 *
 * Si no hay clave o falla todo, el mapa sale vacío y mandan las reglas.
 */
async function judgeOffers(fresh: readonly Offer[], deps: PipelineDeps): Promise<Map<string, JudgeVerdict>> {
  const candidates = fresh.filter((o) => isJudgeable(decideShipping(o, deps.profile)));
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

/** De qué familia es un descarte del juez, para que el motivo guardado cuadre. */
function rejectedByOf(judgment: JudgeVerdict): RejectedBy {
  if (!judgment.isOffer) return 'not-offer';
  return judgment.rejection === 'onsite' || judgment.rejection === 'other-country' ? 'location' : 'veto';
}

/**
 * Las reglas y el juez se cruzan aquí. El juez puede:
 *   - vetar lo que las reglas aceptaron (como siempre),
 *   - y RESCATAR lo que las reglas descartaron, salvo por `stack`.
 *
 * Un rescate sale marcado como `uncertain`: va a la bandeja con el aviso de
 * «por confirmar», no como una oferta limpia. Y si lo que se revocó fue la
 * ubicación, la ubicación se baja a `Unknown`: la regla que afirmaba
 * «presencial» es justo la que el juez acaba de tumbar, así que seguir
 * mostrándola sería repetir el error con la etiqueta cambiada.
 */
function applyJudgment(rules: Verdict, judgment: JudgeVerdict | undefined): Verdict {
  if (!judgment) return rules;

  if (!judgment.isOffer || judgment.rejection) {
    // Ya descartada por las reglas: se queda con su motivo, que es más concreto.
    if (!rules.accepted) return rules;
    return {
      ...rules,
      accepted: false,
      reason: `[IA] ${judgment.reason || judgment.rejection || 'no es una oferta'}`,
      rejectedBy: rejectedByOf(judgment),
    };
  }

  const refined = {
    ...rules,
    seniority: judgment.junior ? JobSeniority.Junior : rules.seniority,
    aggregator: judgment.aggregator || rules.aggregator,
  };
  if (rules.accepted) return refined;
  if (rules.rejectedBy === 'stack') return rules;

  return {
    ...refined,
    accepted: true,
    reason: null,
    rejectedBy: null,
    uncertain: true,
    location: rules.rejectedBy === 'location' ? JobLocation.Unknown : rules.location,
  };
}

function toNewJob(
  source: string,
  offer: Offer,
  verdict: Verdict,
  judgeStatus: JudgeStatus,
  runId: number,
  metrics: PostMetrics | null,
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
    // Del veredicto FINAL, no de las reglas: si el juez revocó un descarte por
    // ubicación, la ubicación que afirmaba esa regla ya no vale.
    location: locationLabel(verdict.location, verdict.reason),
    locationKind: verdict.location,
    verdict: verdict.accepted ? JobVerdict.Accepted : JobVerdict.Rejected,
    rejectionReason: verdict.accepted ? null : verdict.reason,
    seniority: verdict.seniority,
    isAggregator: verdict.aggregator,
    isUncertain: verdict.uncertain,
    judgeStatus,
    stackMatch: verdict.stackMatch,
    applyUrl: verdict.applyUrl,
    contactEmail: verdict.contactEmail,
    // De la plataforma, no nuestra: cuándo la publicaron y cuánta gente va ya.
    postedAt: metrics?.postedAt ?? null,
    applications: metrics?.applications ?? null,
    responseDays: metrics?.responseDays ?? null,
    runId,
  };
}
