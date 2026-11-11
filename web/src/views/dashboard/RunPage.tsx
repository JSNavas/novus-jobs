import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Box, Typography } from '@mui/material';
import { ALL_VERDICTS, getRun, type JobQuery } from '../../api/client';
import { AppAlert, BlankCard, PageContainer } from '../../components/ui';
import { formatDateTime } from '../../format';
import { RunStatus, type RunInfo } from '../../types';
import JobList from '../jobs/JobList';

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
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Error desconocido');
      });
    return () => { cancelled = true; };
  }, [runId]);

  // Sin `useMemo` el objeto sería nuevo en cada render y la lista se recargaría
  // en bucle: es una dependencia de su efecto.
  const query = useMemo<JobQuery>(() => ({ verdict: ALL_VERDICTS, runId }), [runId]);

  const summary = (current: RunInfo): string => {
    const read = current.fetched === 1 ? '1 publicación leída' : `${current.fetched} publicaciones leídas`;
    return `${read} · ${current.accepted} encajaron · ${current.rejected} descartadas`;
  };

  return (
    <PageContainer
      title={run ? `Búsqueda del ${formatDateTime(run.startedAt)}` : 'Búsqueda'}
      subtitle={run ? summary(run) : 'Cargando…'}
      breadcrumbs={[{ title: 'Dashboard', to: '/' }, { title: `Búsqueda ${runId}` }]}
    >
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      {run?.status === RunStatus.Error && run.error ? (
        <AppAlert severity="error">{run.error}</AppAlert>
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

      <Box mt={2}>
        <JobList query={query} empty="Esta búsqueda no guardó ninguna oferta nueva." />
      </Box>
    </PageContainer>
  );
};

export default RunPage;
