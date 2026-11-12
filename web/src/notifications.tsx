import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getStats, type Stats } from './api/client';
import { t } from './i18n';
import { runFailureAdvice, runFailureLabel } from './labels';
import { RunStatus, type RunInfo } from './types';

const POLL_INTERVAL_MS = 15_000;
const MAX_NOTICES = 20;

export type NoticeTone = 'success' | 'warning' | 'error';

export interface Notice {
  id: number;
  tone: NoticeTone;
  title: string;
  detail: string;
  at: string;
}

export function noticeOf(run: RunInfo): Omit<Notice, 'id'> {
  if (run.status === RunStatus.Error) {
    return {
      tone: 'error',
      title: run.failure ? runFailureLabel(run.failure) : t('notice.runFailed'),
      detail: run.error ?? (run.failure ? runFailureAdvice(run.failure, run.source) : ''),
      at: run.finishedAt ?? run.startedAt,
    };
  }
  if (run.failure) {
    return {
      tone: 'warning',
      title: runFailureLabel(run.failure),
      detail: runFailureAdvice(run.failure, run.source),
      at: run.finishedAt ?? run.startedAt,
    };
  }
  if (run.accepted === 0) {
    return {
      tone: 'success',
      title: t('notice.runNothing'),
      detail: t('notice.runNothing.detail', { read: run.fetched }),
      at: run.finishedAt ?? run.startedAt,
    };
  }
  return {
    tone: 'success',
    title: t('notice.runDone'),
    detail: t('notice.runDone.detail', { accepted: run.accepted, read: run.fetched }),
    at: run.finishedAt ?? run.startedAt,
  };
}

interface NotificationsValue {
  stats: Stats | null;
  notices: Notice[];
  latest: Notice | null;
  unread: number;
  markRead: () => void;
  push: (notice: Omit<Notice, 'id'>) => void;
  refresh: () => void;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function useNotifications(): NotificationsValue {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error('useNotifications fuera de NotificationsProvider');
  return value;
}

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const nextId = useRef(1);
  const lastRunId = useRef<number | null>(null);
  const primed = useRef(false);

  const push = useCallback((notice: Omit<Notice, 'id'>) => {
    setNotices((current) => [{ ...notice, id: nextId.current++ }, ...current].slice(0, MAX_NOTICES));
    setUnread((current) => current + 1);
  }, []);

  const load = useCallback(() => {
    getStats().then(setStats).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const run = stats?.lastRun;
    if (!run) return;
    if (!primed.current) {
      primed.current = true;
      lastRunId.current = run.id;
      return;
    }
    if (run.status === RunStatus.Running || run.id === lastRunId.current) return;
    lastRunId.current = run.id;
    push(noticeOf(run));
  }, [stats, push]);

  const value = useMemo<NotificationsValue>(() => ({
    stats,
    notices,
    latest: notices[0] ?? null,
    unread,
    markRead: () => setUnread(0),
    push,
    refresh: load,
  }), [stats, notices, unread, push, load]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};
