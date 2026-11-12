import { t, type TranslationKey } from '../../i18n';
import type { Job } from '../../types';

type RejectionTone = 'warning' | 'neutral';

export interface RejectionCategory {
  label: string;
  tone: RejectionTone;
}

const BADGES: Record<string, { key: TranslationKey; tone: RejectionTone }> = {
  'reject.ai': { key: 'badge.ai', tone: 'warning' },
  'reject.notAVacancy': { key: 'badge.notOffer', tone: 'neutral' },
  'reject.notAnOffer': { key: 'badge.notOffer', tone: 'neutral' },
  'reject.otherCountry': { key: 'badge.otherCountry', tone: 'neutral' },
  'reject.onsite': { key: 'badge.onsite', tone: 'neutral' },
  'reject.hybrid': { key: 'badge.hybrid', tone: 'neutral' },
  'reject.homeCountryOnly': { key: 'badge.homeCountry', tone: 'neutral' },
  'reject.globalRemote': { key: 'badge.globalRemote', tone: 'neutral' },
  'reject.unknownTech': { key: 'badge.tech', tone: 'neutral' },
  'reject.english': { key: 'badge.english', tone: 'neutral' },
  'reject.localEmployer': { key: 'badge.localEmployer', tone: 'neutral' },
  'reject.otherEcosystem': { key: 'badge.otherEcosystem', tone: 'warning' },
  'reject.peripheral': { key: 'badge.peripheral', tone: 'warning' },
  'reject.noStack': { key: 'badge.noStack', tone: 'neutral' },
  'reject.stale': { key: 'badge.stale', tone: 'neutral' },
};

export function rejectionCategory(job: Pick<Job, 'rejectionCode'>): RejectionCategory {
  const badge = job.rejectionCode ? BADGES[job.rejectionCode] : undefined;
  if (!badge) return { label: t('badge.other'), tone: 'neutral' };
  return { label: t(badge.key), tone: badge.tone };
}

export function rejectionText(job: Pick<Job, 'rejectionCode' | 'rejectionParams' | 'rejectionReason'>): string {
  if (!job.rejectionCode) return job.rejectionReason ?? '';
  return t(job.rejectionCode as TranslationKey, job.rejectionParams ?? undefined);
}
