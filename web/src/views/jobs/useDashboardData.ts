import { useCallback, useEffect, useState } from 'react';
import { getStats, listJobs, type JobQuery, type JobsPage, type Stats } from '../../api/client';

export function useDashboardData(query: JobQuery) {
  const [page, setPage] = useState<JobsPage | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([listJobs(query), getStats()])
      .then(([nextPage, nextStats]) => {
        if (cancelled) return;
        setPage(nextPage);
        setStats(nextStats);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Error desconocido');
      });

    return () => {
      cancelled = true;
    };
  }, [query, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  return { page, stats, error, reload };
}
