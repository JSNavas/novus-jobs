import { t, type TranslationKey } from '../../i18n';
import { JobStatus } from '../../types';

export interface InboxView {
  status: JobStatus;
  path: string;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  emptyKey: TranslationKey;
}

export const INBOX_VIEWS: readonly InboxView[] = [
  {
    status: JobStatus.New,
    path: '/nuevas',
    titleKey: 'inbox.new.title',
    subtitleKey: 'inbox.new.subtitle',
    emptyKey: 'inbox.new.empty',
  },
  {
    status: JobStatus.Seen,
    path: '/vistas',
    titleKey: 'inbox.seen.title',
    subtitleKey: 'inbox.seen.subtitle',
    emptyKey: 'inbox.seen.empty',
  },
  {
    status: JobStatus.Saved,
    path: '/guardadas',
    titleKey: 'inbox.saved.title',
    subtitleKey: 'inbox.saved.subtitle',
    emptyKey: 'inbox.saved.empty',
  },
  {
    status: JobStatus.Dismissed,
    path: '/descartadas',
    titleKey: 'inbox.dismissed.title',
    subtitleKey: 'inbox.dismissed.subtitle',
    emptyKey: 'inbox.dismissed.empty',
  },
];

export function showsCount(view: InboxView): boolean {
  return view.status === JobStatus.New || view.status === JobStatus.Saved;
}

export function viewByPath(pathname: string): InboxView {
  return INBOX_VIEWS.find((v) => v.path === pathname) ?? INBOX_VIEWS[0]!;
}

export const titleOf = (view: InboxView): string => t(view.titleKey);
export const subtitleOf = (view: InboxView): string => t(view.subtitleKey);
export const emptyOf = (view: InboxView): string => t(view.emptyKey);
