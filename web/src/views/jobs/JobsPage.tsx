import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { t } from '../../i18n';
import {
  listIntegrations, PAGE_SIZE, updateJobStatus, type Integration, type JobQuery,
} from '../../api/client';
import { AppAlert, AppPagination, AppSnackbar, PageContainer } from '../../components/ui';
import { JobStatus, type Job } from '../../types';
import JobCard from './JobCard';
import { viewByPath, emptyOf, subtitleOf, titleOf } from './inbox';
import { nextSearchSentence } from './scheduleText';
import { IconInbox, IconRefresh } from '@tabler/icons-react';
import JobFilters, { sinceOfWindow, type FilterValues } from './JobFilters';
import LastRunAlert from './LastRunAlert';
import { useDashboardData } from './useDashboardData';

interface Notice {
  message: string;
  severity: 'success' | 'error';
}

const errorMessage = (cause: unknown): string => (cause instanceof Error ? cause.message : t('run.unknownError'));

const JobsPage = () => {
  const view = viewByPath(useLocation().pathname);
  const [filters, setFilters] = useState<FilterValues>({ q: '', hasApply: false, source: 'all', date: 'all' });
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => { setPageNumber(1); }, [filters, view]);

  const query = useMemo<JobQuery>(
    () => ({
      status: view.status ?? undefined,
      q: filters.q.trim() || undefined,
      source: filters.source === 'all' ? undefined : filters.source,
      since: sinceOfWindow(filters.date),
      hasApply: filters.hasApply ? true : undefined,
      limit: PAGE_SIZE,
      offset: (pageNumber - 1) * PAGE_SIZE,
    }),
    [filters, view, pageNumber],
  );

  const { page, stats, schedule, settings, error, reload } = useDashboardData(query);

  useEffect(() => {
    let cancelled = false;
    listIntegrations().then((next) => { if (!cancelled) setIntegrations(next); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

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

  const filtering = Boolean(filters.q || filters.hasApply || filters.source !== 'all' || filters.date !== 'all');

  const emptyTitle = (): string => (filtering ? t('jobs.empty.filters') : emptyOf(view));

  const emptyHint = (): string => {
    if (filtering) return t('jobs.empty.filters.hint');
    return view.status === JobStatus.New ? nextSearchSentence(schedule) : '';
  };

  const refreshButton = (
    <Button variant="outlined" size="small" startIcon={<IconRefresh size={14} stroke={1.6} />} onClick={reload}>
      {t('jobs.refresh')}
    </Button>
  );

  return (
    <PageContainer
      title={titleOf(view)}
      subtitle={subtitleOf(view)}
      action={refreshButton}
    >
      {stats ? <LastRunAlert lastRun={stats.lastRun} /> : null}

      <JobFilters values={filters} integrations={integrations} onChange={setFilters} />

      {page ? (
        <Typography variant="label" color="text.secondary" sx={{ display: 'block', mb: 1.75 }}>
          {t('filters.result', { count: page.total })}
        </Typography>
      ) : null}

      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      {!page && !error ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : null}

      {page && page.items.length === 0 ? (
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={1.5}
          sx={{ minHeight: 320, border: 1, borderColor: 'divider', borderRadius: 1, px: 3, textAlign: 'center' }}
        >
          <IconInbox size={30} stroke={1.3} color="currentColor" style={{ opacity: 0.5 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 500, mt: 0.625 }}>{emptyTitle()}</Typography>
          {emptyHint() ? (
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{emptyHint()}</Typography>
          ) : null}
        </Stack>
      ) : null}

      <Stack spacing={1.5}>
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
