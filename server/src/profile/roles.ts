export const ROLES = ['software', 'qa', 'data', 'devops', 'design'] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLES: readonly Role[] = ['software'];

interface RoleDefinition {
  readonly judge: string;
  readonly titles: RegExp;
}

export const ROLE_DEFINITIONS: Readonly<Record<Role, RoleDefinition>> = {
  software: {
    judge: 'desarrollo de software (frontend, backend, full stack, móvil)',
    titles: /\b(front[\s-]?end|back[\s-]?end|full[\s-]?stack|web\s+developer|desarrollador(a)?\s+web|software\s+engineer|desarrollador(a)?\s+(de\s+)?software)\b/i,
  },
  qa: {
    judge: 'QA y testing (pruebas manuales y automatizadas)',
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

const ALWAYS_OTHER_TRADES = 'soporte técnico, seguridad y redes, gestión de producto, ventas, marketing o reclutamiento';

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLES.some((r) => r === value);
}

export function namesOwnTrade(text: string, roles: readonly Role[]): boolean {
  return roles.some((role) => ROLE_DEFINITIONS[role].titles.test(text));
}

export function tradesFor(roles: readonly Role[]): string {
  return roles.map((role) => ROLE_DEFINITIONS[role].judge).join(' y ');
}

export function otherTradesFor(roles: readonly Role[]): string {
  const others = ROLES.filter((role) => !roles.includes(role)).map((role) => ROLE_DEFINITIONS[role].judge);
  return [...others, ALWAYS_OTHER_TRADES].join(', ');
}

const HEADLINE_CHARS = 600;

export function rolesInCv(text: string): Role[] {
  const head = text.slice(0, HEADLINE_CHARS);
  return ROLES.filter((role) => ROLE_DEFINITIONS[role].titles.test(head));
}
