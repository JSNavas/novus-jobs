import { useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { ApiError, startRun, updateJobStatus, type JobQuery } from '../../api/client';
import { AppAlert, AppChip, AppSnackbar, AppTabs, PageContainer } from '../../components/ui';
import { findEnumValue } from '../../enumValue';
import { jobSeniorityLabel } from '../../labels';
import { JobSeniority, JobStatus, type Job } from '../../types';
import JobCard from './JobCard';
import JobFilters, { type FilterValues } from './JobFilters';
import StatsRow from './StatsRow';
import { useDashboardData } from './useDashboardData';

interface Notice {
  message: string;
  severity: 'success' | 'error';
}

const seniorityTabs = Object.values(JobSeniority).map((seniority) => ({
  value: seniority,
  label: jobSeniorityLabel[seniority],
}));

const newCountText = (count: number): string => (count === 1 ? '1 oferta nueva' : `${count} ofertas nuevas`);

const errorMessage = (cause: unknown): string => (cause instanceof Error ? cause.message : 'Error desconocido');

const JobsPage = () => {
  const [seniority, setSeniority] = useState<JobSeniority>(JobSeniority.Regular);
  const [filters, setFilters] = useState<FilterValues>({ status: '', q: '', hasApply: false });
  const [starting, setStarting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const query = useMemo<JobQuery>(
    () => ({
      seniority,
      status: filters.status || undefined,
      q: filters.q.trim() || undefined,
      hasApply: filters.hasApply ? true : undefined,
    }),
    [seniority, filters],
  );

  const { page, stats, error, reload } = useDashboardData(query);

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

  const searchButton = (
    <Button variant="contained" onClick={handleStartRun} disabled={starting}>
      Buscar ahora
    </Button>
  );

  return (
    <PageContainer
      title="Ofertas de empleo"
      subtitle="Ofertas de LinkedIn que pasan tus reglas de perfil"
      action={searchButton}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        {stats ? <AppChip label={newCountText(stats.new)} tone="success" /> : null}
      </Stack>

      {stats ? <StatsRow stats={stats} /> : null}

      <AppTabs
        tabs={seniorityTabs}
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
          No hay ofertas con estos filtros.
        </Typography>
      ) : null}

      <Stack spacing={2}>
        {page?.items.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            busy={updatingId === job.id}
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
