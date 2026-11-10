import { useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { ApiError, startRun, updateJobStatus, type JobQuery } from '../../api/client';
import { AppAlert, AppChip, AppSnackbar, AppTabs, PageContainer } from '../../components/ui';
import { findEnumValue } from '../../enumValue';
import { jobSeniorityLabel } from '../../labels';
import { JobSeniority, JobStatus, type Job } from '../../types';
import JobCard from './JobCard';
import { viewByPath } from './inbox';
import { nextSearchSentence } from './scheduleText';
import JobFilters, { type FilterValues } from './JobFilters';
import LastRunAlert from './LastRunAlert';
import StatsRow from './StatsRow';
import { useDashboardData } from './useDashboardData';

interface Notice {
  message: string;
  severity: 'success' | 'error';
}

/**
 * Las pestañas llevan su número.
 *
 * Sin él, el menú podía decir "1 nueva" y la pestaña abierta salir vacía: las
 * dos cosas eran ciertas —la única oferta era junior y estaba en la otra— pero
 * juntas parecían un error. El número dice de un vistazo dónde está.
 */
const seniorityTabs = (counts: Record<JobSeniority, number> | undefined) =>
  Object.values(JobSeniority).map((seniority) => ({
    value: seniority,
    label: counts ? `${jobSeniorityLabel[seniority]} (${counts[seniority]})` : jobSeniorityLabel[seniority],
  }));

/** La otra pestaña, para poder mandar allí cuando esta está vacía y aquella no. */
const otherSeniority = (current: JobSeniority): JobSeniority =>
  current === JobSeniority.Regular ? JobSeniority.Junior : JobSeniority.Regular;

const newCountText = (count: number): string => (count === 1 ? '1 oferta nueva' : `${count} ofertas nuevas`);

const errorMessage = (cause: unknown): string => (cause instanceof Error ? cause.message : 'Error desconocido');

const JobsPage = () => {
  // Qué lista se está mirando lo dice la URL, no un estado interno: así el
  // enlace del menú, el botón de atrás y un enlace compartido llevan al mismo
  // sitio, y el correo puede apuntar directo a /guardadas el día que haga falta.
  const view = viewByPath(useLocation().pathname);
  const [seniority, setSeniority] = useState<JobSeniority>(JobSeniority.Regular);
  const [filters, setFilters] = useState<FilterValues>({ q: '', hasApply: false });
  const [starting, setStarting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const query = useMemo<JobQuery>(
    () => ({
      seniority,
      status: view.status ?? undefined,
      q: filters.q.trim() || undefined,
      hasApply: filters.hasApply ? true : undefined,
    }),
    [seniority, filters, view],
  );

  const { page, stats, schedule, settings, error, reload } = useDashboardData(query);

  const handleStartRun = async () => {
    setStarting(true);
    try {
      await startRun();
      setNotice({ message: 'Búsqueda iniciada. Las ofertas nuevas aparecerán al terminar.', severity: 'success' });
      reload();
    } catch (cause: unknown) {
      const conflict = cause instanceof ApiError && cause.status === 409;
      setNotice({
        message: conflict ? `Ya hay una búsqueda en curso: ${errorMessage(cause)}` : errorMessage(cause),
        severity: 'error',
      });
    } finally {
      setStarting(false);
    }
  };

  const handleStatusChange = async (job: Job, status: JobStatus) => {
    setUpdatingId(job.id);
    try {
      await updateJobStatus(job.id, status);
      reload();
    } catch (cause: unknown) {
      setNotice({ message: errorMessage(cause), severity: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  /**
   * Qué decir cuando la lista sale vacía. Nunca "no hay nada" a secas si lo que
   * pasa es que está en la otra pestaña: ese mensaje contradice al contador y
   * hace dudar de todo lo demás.
   */
  const emptyMessage = (): string => {
    if (filters.q || filters.hasApply) return 'No hay ofertas con estos filtros.';
    const elsewhere = page?.bySeniority[otherSeniority(seniority)] ?? 0;
    if (elsewhere > 0) {
      const label = jobSeniorityLabel[otherSeniority(seniority)];
      return elsewhere === 1
        ? `Aquí no hay ninguna, pero tienes 1 en «${label}».`
        : `Aquí no hay ninguna, pero tienes ${elsewhere} en «${label}».`;
    }
    const next = view.status === JobStatus.New ? nextSearchSentence(schedule) : '';
    return [view.empty, next].filter(Boolean).join(' ');
  };

  const searchButton = (
    <Button variant="contained" onClick={handleStartRun} disabled={starting}>
      Buscar ahora
    </Button>
  );

  return (
    <PageContainer
      title={view.title}
      subtitle={view.subtitle}
      action={searchButton}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        {stats ? <AppChip label={newCountText(stats.new)} tone="success" /> : null}
      </Stack>

      {stats ? <LastRunAlert lastRun={stats.lastRun} /> : null}
      {stats ? <StatsRow stats={stats} /> : null}

      <AppTabs
        tabs={seniorityTabs(page?.bySeniority)}
        value={seniority}
        onChange={(value) => setSeniority(findEnumValue(Object.values(JobSeniority), value) ?? JobSeniority.Regular)}
      />
      <JobFilters values={filters} onChange={setFilters} />

      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      {!page && !error ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : null}

      {page && page.items.length === 0 ? (
        <Typography color="textSecondary" py={4} textAlign="center">
          {/* El vacío de cada lista dice algo distinto: "no hay nada nuevo" y
              "todavía no has guardado ninguna" son dos situaciones y una sola
              frase genérica las confundiría. */}
          {emptyMessage()}
        </Typography>
      ) : null}

      <Stack spacing={2}>
        {page?.items.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            busy={updatingId === job.id}
            settings={settings}
            onStatusChange={(status) => handleStatusChange(job, status)}
          />
        ))}
      </Stack>

      <AppSnackbar
        message={notice?.message ?? null}
        severity={notice?.severity ?? 'success'}
        onClose={() => setNotice(null)}
      />
    </PageContainer>
  );
};

export default JobsPage;
