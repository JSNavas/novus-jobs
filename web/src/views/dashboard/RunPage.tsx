import { plural, t } from '../../i18n';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Box, Typography } from '@mui/material';
import { ALL_VERDICTS, getRun, type JobQuery } from '../../api/client';
import { AppAlert, AppStatusPilot, BlankCard, PageContainer } from '../../components/ui';
import { formatDateTime } from '../../format';
import { RunStatus, type RunInfo } from '../../types';
import JobList from '../jobs/JobList';
import { runStatusLabel, runStatusTone } from './runStatus';

/**
 * TODO lo que encontró una búsqueda, aceptado y descartado junto.
 *
 * Separar aquí las buenas de las malas sería esconder la mitad del trabajo: lo
 * que se viene a ver es el criterio en acción, y eso solo se juzga leyendo
 * seguidas la que pasó y la que no. Cada tarjeta ya dice en qué lado cayó y por
 * qué motivo.
 */
const RunPage = () => {
  const { id } = useParams<{ id: string }>();
  const runId = Number(id);
  const [run, setRun] = useState<RunInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRun(runId)
      .then((next) => { if (!cancelled) { setRun(next); setError(null); } })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : t('run.unknownError'));
      });
    return () => { cancelled = true; };
  }, [runId]);

  // Sin `useMemo` el objeto sería nuevo en cada render y la lista se recargaría
  // en bucle: es una dependencia de su efecto.
  const query = useMemo<JobQuery>(() => ({ verdict: ALL_VERDICTS, runId }), [runId]);

  const summary = (current: RunInfo): string => {
    const read = plural(current.fetched, 'stats.read.one', 'stats.read.many');
    return t('run.summary', { read, accepted: current.accepted, rejected: current.rejected });
  };

  return (
    <PageContainer
      title={run ? t('run.title', { date: formatDateTime(run.startedAt) }) : t('run.title.loading')}
      subtitle={run ? summary(run) : t('run.loading')}
      breadcrumbs={[{ title: t('dash.title'), to: '/' }, { title: t('run.breadcrumb', { id: runId }) }]}
      action={run ? <AppStatusPilot label={runStatusLabel(run)} tone={runStatusTone(run)} /> : null}
    >
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      {run?.status === RunStatus.Error && run.error ? (
        <AppAlert severity="error">
          <Typography variant="body2" fontWeight={600} component="div">{t('run.failed.heading')}</Typography>
          <Typography variant="caption" component="div" sx={{ opacity: 0.8 }}>{run.error}</Typography>
        </AppAlert>
      ) : null}

      {/* Una búsqueda que leyó cosas y no guardó ninguna no está rota: eran
          todas publicaciones que ya estaban en la base. Decirlo evita que el
          "0" de abajo parezca un fallo. */}
      {run && run.fetched > 0 && run.accepted + run.rejected === 0 ? (
        <BlankCard>
          <Box p={2.5}>
            <Typography variant="body2" color="textSecondary">
              Leyó {run.fetched} publicaciones y no guardó ninguna: todas estaban ya vistas en búsquedas anteriores.
            </Typography>
          </Box>
        </BlankCard>
      ) : null}

      <Typography variant="h6" mt={3} mb={1}>{t('run.offers')}</Typography>
      <Typography variant="body2" color="textSecondary" mb={2}>
        Aceptadas y descartadas juntas. Cada tarjeta dice en qué lado cayó y por qué.
      </Typography>
      <JobList query={query} empty={t('run.offers.empty')} />
    </PageContainer>
  );
};

export default RunPage;
