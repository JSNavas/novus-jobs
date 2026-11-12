import type { CandidateProfile } from './types.js';

export const DEFAULT_PROFILE: CandidateProfile = {
  language: 'es',
  stack: [],
  core: [],
  cannotDo: [],
  english: { level: 'none', filter: false },
  geo: { country: '', city: null, timezone: '', excludeLocalEmployers: false },
  modality: { remoteGlobal: true, remoteHomeCountry: true, hybrid: true, onsite: true },
};
