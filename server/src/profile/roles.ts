/**
 * The trades a person can look for work in. The filter used to assume one —
 * software development — in three places: the job titles that count as "your
 * role", the judge's idea of what is "another trade", and the default cover
 * letter. A QA engineer got their own postings thrown away as "not software".
 * Now each of those reads the trades in the profile.
 */
export const ROLES = ['software', 'qa', 'data', 'devops', 'design'] as const;

export type Role = (typeof ROLES)[number];

/** What an install that never chose a trade had: the project's only one, until now. */
export const DEFAULT_ROLES: readonly Role[] = ['software'];

interface RoleDefinition {
  /** How the judge's instruction (written in Spanish) names the trade. */
  readonly judge: string;
  /** Job titles of the trade, for a posting that names none of your technologies. */
  readonly titles: RegExp;
}

export const ROLE_DEFINITIONS: Readonly<Record<Role, RoleDefinition>> = {
  software: {
    judge: 'desarrollo de software (frontend, backend, full stack, móvil)',
    titles: /\b(front[\s-]?end|back[\s-]?end|full[\s-]?stack|web\s+developer|desarrollador(a)?\s+web|software\s+engineer|desarrollador(a)?\s+(de\s+)?software)\b/i,
  },
  qa: {
    judge: 'QA y testing (pruebas manuales y automatizadas)',
    // Titles, not mentions: "work with the QA team", "QA/QC", "hacen el QA" and
    // "quality assurance practices" are everywhere, in every trade's postings.
    titles: /\b(qa\s+(?:engineer|analyst|automation|tester|lead|specialist|manual)|quality\s+assurance\s+(?:engineer|analyst|specialist|tester)|(?<!penetration\s)(?<!pen\s)tester|test(?:ing)?\s+engineer|sdet|test\s+automation|automation\s+(?:qa|tester)|analista\s+(?:de\s+)?(?:pruebas|qa|calidad)|ingenier[oa]\s+(?:de\s+)?(?:pruebas|calidad|qa)|especialista\s+(?:de\s+|en\s+)?(?:qa|pruebas))\b/i,
  },
  data: {
    judge: 'datos (data engineer, analista de datos, BI, ciencia de datos)',
    titles: /\b(data\s+(?:engineer|analyst|scientist)|analytics\s+engineer|business\s+intelligence|bi\s+(?:developer|analyst)|ingenier[oa]\s+de\s+datos|analista\s+de\s+datos|cient[ií]fic[oa]\s+de\s+datos|machine\s+learning\s+engineer|ml\s+engineer)\b/i,
  },
  devops: {
    judge: 'DevOps, SRE y cloud',
    titles: /\b(devops|sre|site\s+reliability|platform\s+engineer|cloud\s+engineer|ingenier[oa]\s+cloud)\b/i,
  },
  design: {
    judge: 'diseño UX/UI y de producto',
    titles: /\b(ux\/ui|ui\/ux|ux\s+designer|ui\s+designer|product\s+designer|dise[ñn]ador(a)?\s+(?:ux|ui|de\s+producto))\b/i,
  },
};

/** Never anyone's trade here: the judge always treats these as another job. */
const ALWAYS_OTHER_TRADES = 'soporte técnico, seguridad y redes, gestión de producto, ventas, marketing o reclutamiento';

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLES.some((r) => r === value);
}

/** Does the posting's text name a job title of one of these trades? */
export function namesOwnTrade(text: string, roles: readonly Role[]): boolean {
  return roles.some((role) => ROLE_DEFINITIONS[role].titles.test(text));
}

/** "desarrollo de software (…) y QA y testing (…)", for the judge. */
export function tradesFor(roles: readonly Role[]): string {
  return roles.map((role) => ROLE_DEFINITIONS[role].judge).join(' y ');
}

/** Everything that is not the person's trade, for the judge's "role" rejection. */
export function otherTradesFor(roles: readonly Role[]): string {
  const others = ROLES.filter((role) => !roles.includes(role)).map((role) => ROLE_DEFINITIONS[role].judge);
  return [...others, ALWAYS_OTHER_TRADES].join(', ');
}

const HEADLINE_CHARS = 600;

/**
 * The trades a CV's headline names ("QA Automation Engineer", "Data Analyst").
 * Only the top of the CV: a developer who "worked with the QA team" is not QA.
 */
export function rolesInCv(text: string): Role[] {
  const head = text.slice(0, HEADLINE_CHARS);
  return ROLES.filter((role) => ROLE_DEFINITIONS[role].titles.test(head));
}
