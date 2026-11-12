import { t } from '../../i18n';
import { useEffect, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { getSettings, listJobs, PAGE_SIZE, updateJobStatus, type JobQuery, type JobsPage, type Settings } from '../../api/client';
import { AppAlert, AppPagination, AppSnackbar } from '../../components/ui';
import { JobStatus, type Job } from '../../types';
import JobCard from './JobCard';

interface JobListProps {
  query: JobQuery;
  empty: string;
}

const errorMessage = (cause: unknown): string => (cause instanceof Error ? cause.message : t('run.unknownError'));

const JobList = ({ query, empty }: JobListProps) => {
  const [result, setResult] = useState<JobsPage | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [query]);

  useEffect(() => {
    let cancelled = false;
    getSettings().then((next) => { if (!cancelled) setSettings(next); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listJobs({ ...query, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      .then((next) => { if (!cancelled) { setResult(next); setError(null); } })
      .catch((cause: unknown) => { if (!cancelled) setError(errorMessage(cause)); });
    return () => { cancelled = true; };
  }, [query, revision, page]);

  const handleStatusChange = async (job: Job, status: JobStatus) => {
    setUpdatingId(job.id);
    try {
      await updateJobStatus(job.id, status);
      setRevision((value) => value + 1);
    } catch (cause: unknown) {
      setNotice(errorMessage(cause));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      {!result && !error ? (
        <Box sx={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : null}

      {result && result.items.length === 0 ? (
        <Typography color="textSecondary" py={4} textAlign="center">{empty}</Typography>
      ) : null}

      <Stack spacing={2}>
        {result?.items.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            busy={updatingId === job.id}
            settings={settings}
            onStatusChange={(status) => void handleStatusChange(job, status)}
          />
        ))}
      </Stack>

      {result ? (
        <AppPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={result.total}
          onChange={setPage}
          noun="ofertas"
        />
      ) : null}

      <AppSnackbar message={notice} severity="error" onClose={() => setNotice(null)} />
    </>
  );
};

export default JobList;
