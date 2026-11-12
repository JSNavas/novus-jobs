import { t } from './i18n';
import { JobLocation, JobSeniority, JobStatus, RunFailure } from './types';

export function jobStatusLabel(status: JobStatus): string {
  switch (status) {
    case JobStatus.New: return t('status.new');
    case JobStatus.Seen: return t('status.seen');
    case JobStatus.Saved: return t('status.saved');
    case JobStatus.Dismissed: return t('status.dismissed');
  }
}

export function jobSeniorityLabel(seniority: JobSeniority): string {
  return seniority === JobSeniority.Junior ? t('seniority.junior') : t('seniority.regular');
}

export function jobLocationLabel(location: JobLocation): string {
  switch (location) {
    case JobLocation.HomeCountry: return t('location.homeCountry');
    case JobLocation.Global: return t('location.global');
    case JobLocation.OtherCountry: return t('location.otherCountry');
    case JobLocation.Onsite: return t('location.onsite');
    case JobLocation.Hybrid: return t('location.hybrid');
    case JobLocation.Unknown: return t('location.unknown');
  }
}

export function runFailureLabel(failure: RunFailure): string {
  switch (failure) {
    case RunFailure.LoginRequired: return t('failure.loginRequired');
    case RunFailure.ProfileBusy: return t('failure.profileBusy');
    case RunFailure.Layout: return t('failure.layout');
    case RunFailure.Other: return t('failure.other');
  }
}

export function runFailureAdvice(failure: RunFailure, source: string): string {
  switch (failure) {
    case RunFailure.LoginRequired: return t('failure.loginRequired.advice', { source });
    case RunFailure.ProfileBusy: return t('failure.profileBusy.advice');
    case RunFailure.Layout: return t('failure.layout.advice');
    case RunFailure.Other: return t('failure.other.advice');
  }
}

let sourceLabels: Record<string, string> = {};

export function setSourceLabels(integrations: readonly { name: string; label: string }[]): void {
  sourceLabels = Object.fromEntries(integrations.map((i) => [i.name, i.label]));
}

export const jobSourceLabel = (source: string): string => sourceLabels[source] ?? source;
