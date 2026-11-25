import { DEFAULT_ROLES } from './roles.js';
import { SENIORITY_LEVELS, type CandidateProfile } from './types.js';

export const DEFAULT_PROFILE: CandidateProfile = {
  language: 'es',
  roles: DEFAULT_ROLES,
  stack: [],
  core: [],
  cannotDo: [],
  english: { level: 'none', filter: false },
  experience: { years: null, levels: SENIORITY_LEVELS },
  geo: { country: '', city: null, timezone: '', excludeLocalEmployers: false },
  modality: { remoteGlobal: true, remoteHomeCountry: true, hybrid: true, onsite: true },
};
