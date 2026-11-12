import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { t } from '../../i18n';
import { PAGE_SIZE, startRun, updateJobStatus, type JobQuery } from '../../api/client';
import { AppAlert, AppChip, AppPagination, AppSnackbar, AppTabs, PageContainer } from '../../components/ui';
import { findEnumValue } from '../../enumValue';
import { jobSeniorityLabel } from '../../labels';
import { JobSeniority, JobStatus, type Job } from '../../types';
import JobCard from './JobCard';
import { viewByPath, emptyOf, subtitleOf, titleOf } from './inbox';
import { nextSearchSentence } from './scheduleText';
import JobFilters, { type FilterValues } from './JobFilters';
import LastRunAlert from './LastRunAlert';
import StatsRow from './StatsRow';
import { useDashboardData } from './useDashboardData';

interface Notice {
  message: string;
  severity: 'success' | 'error';
}

const seniorityTabs = (counts: Record<JobSeniority, number> | undefined) =>
  Object.values(JobSeniority).map((seniority) => ({
    value: seniority,
    label: counts ? `${jobSeniorityLabel(seniority)} (${counts[seniority]})` : jobSeniorityLabel(seniority),
  }));

const otherSeniority = (current: JobSeniority): JobSeniority =>
  current === JobSeniority.Regular ? JobSeniority.Junior : JobSeniority.Regular;

const newCountText = (count: number): string => (count === 1 ? '1 oferta nueva' : `${count} ofertas nuevas`);

const errorMessage = (cause: unknown): string => (cause instanceof Error ? cause.message : t('run.unknownError'));

const JobsPage = () => {
  const view = viewByPath(useLocation().pathname);
  const [seniority, setSeniority] = useState<JobSeniority>(JobSeniority.Regular);
  const [filters, setFilters] = useState<FilterValues>({ q: '', hasApply: false });
  const [starting, setStarting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => { setPageNumber(1); }, [seniority, filters, view]);

  const query = useMemo<JobQuery>(
    () => ({
      seniority,
      status: view.status ?? undefined,
      q: filters.q.trim() || undefined,
      hasApply: filters.hasApply ? true : undefined,
      limit: PAGE_SIZE,
      offset: (pageNumber - 1) * PAGE_SIZE,
    }),
    [seniority, filters, view, pageNumber],
  );

  const { page, stats, schedule, settings, error, reload } = useDashboardData(query);

  const handleStartRun = async () => {
    setStarting(true);
    try {
      await startRun();
      setNotice({ message: t('jobs.runStarted'), severity: 'success' });
      reload();
    } catch (cause: unknown) {
      setNotice({ message: errorMessage(cause), severity: 'error' });
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

  const emptyMessage = (): string => {
    if (filters.q || filters.hasApply) return t('jobs.empty.filters');
    const elsewhere = page?.bySeniority[otherSeniority(seniority)] ?? 0;
    if (elsewhere > 0) {
      return t('jobs.empty.elsewhere', {
        count: elsewhere,
        tab: jobSeniorityLabel(otherSeniority(seniority)),
      });
    }
    const next = view.status === JobStatus.New ? nextSearchSentence(schedule) : '';
    return [emptyOf(view), next].filter(Boolean).join(' ');
  };

  const searchButton = (
    <Button variant="contained" onClick={handleStartRun} disabled={starting}>
      {t('jobs.searchNow')}
    </Button>
  );

  return (
    <PageContainer
      title={titleOf(view)}
      subtitle={subtitleOf(view)}
      action={searchButton}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        {stats ? <AppChip label={newCountText(stats.new)} tone={stats.new > 0 ? 'success' : 'neutral'} /> : null}
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

      {page ? (
        <AppPagination
          page={pageNumber}
          pageSize={PAGE_SIZE}
          total={page.total}
          onChange={setPageNumber}
          noun="ofertas"
        />
      ) : null}

      <AppSnackbar
        message={notice?.message ?? null}
        severity={notice?.severity ?? 'success'}
        onClose={() => setNotice(null)}
      />
    </PageContainer>
  );
};

export default JobsPage;
