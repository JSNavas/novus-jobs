import { useCallback, useEffect, useState } from 'react';
import { getSchedule, getSettings, getStats, listJobs, type JobQuery, type JobsPage, type Schedule, type Settings, type Stats } from '../../api/client';

const POLL_INTERVAL_MS = 15_000;

/**
 * `page` entra aparte de `query` para que cambiar de página no reinicie nada
 * más, y para que cambiar un filtro pueda devolver a la primera sin pelearse
 * con este efecto.
 */
export function useDashboardData(query: JobQuery) {
  const [page, setPage] = useState<JobsPage | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Las horas de búsqueda no cambian mientras la página está abierta: se piden
  // una vez y no entran en el sondeo.
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSchedule().then((next) => { if (!cancelled) setSchedule(next); }).catch(() => undefined);
    getSettings().then((next) => { if (!cancelled) setSettings(next); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
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

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') setRevision((value) => value + 1);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  return { page, stats, schedule, settings, error, reload };
}
