import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, CircularProgress, InputAdornment, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { IconDownload, IconFilterOff, IconSearch } from '@tabler/icons-react';
import {
  listJobs, listRejectionReasons, PAGE_SIZE, type JobQuery, type RejectionCount,
} from '../../api/client';
import { AppAlert, AppChip, AppPagination, PageContainer } from '../../components/ui';
import { dayLabel, formatTime } from '../../format';
import { t } from '../../i18n';
import { jobSourceLabel } from '../../labels';
import { JobVerdict, type Job } from '../../types';
import { rejectionCategory, rejectionText } from '../jobs/rejectionReason';
import { PlatformIcon } from './panels';
import { useNotifications } from '../../notifications';

const EXPORT_PAGE = 100;
const monoSx = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10, color: 'text.secondary' } as const;

const csvCell = (value: string | number | null): string => `"${String(value ?? '').split('"').join('""')}"`;

const RejectedPage = () => {
  const { stats } = useNotifications();
  const [reasons, setReasons] = useState<RejectionCount[]>([]);
  const [code, setCode] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<{ items: Job[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    listRejectionReasons().then((next) => { if (!cancelled) setReasons(next); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const baseQuery = useMemo<JobQuery>(() => ({
    verdict: JobVerdict.Rejected,
    rejectionCode: code === 'all' ? undefined : code,
    q: query.trim() || undefined,
  }), [code, query]);

  useEffect(() => {
    let cancelled = false;
    listJobs({ ...baseQuery, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      .then((next) => { if (!cancelled) { setRows(next); setError(null); } })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : t('run.unknownError'));
      });
    return () => { cancelled = true; };
  }, [baseQuery, page]);

  const total = reasons.reduce((sum, reason) => sum + reason.count, 0);

  const exportCsv = async (): Promise<void> => {
    setExporting(true);
    try {
      const all: Job[] = [];
      for (let offset = 0; ; offset += EXPORT_PAGE) {
        const chunk = await listJobs({ ...baseQuery, limit: EXPORT_PAGE, offset });
        all.push(...chunk.items);
        if (all.length >= chunk.total || chunk.items.length === 0) break;
      }
      const header = ['id', 'puesto', 'empresa', 'motivo', 'detalle', 'origen', 'fecha'];
      const body = all.map((job) => [
        job.id,
        job.title ?? '',
        job.company ?? job.author ?? '',
        rejectionCategory(job).label,
        rejectionText(job),
        jobSourceLabel(job.source),
        job.foundAt,
      ].map(csvCell).join(','));
      const blob = new Blob([`\ufeff${[header.join(','), ...body].join('\n')}`], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'novus-rechazadas.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : t('run.unknownError'));
    } finally {
      setExporting(false);
    }
  };

  const grouped = new Map<string, { codes: string[]; count: number }>();
  for (const reason of reasons) {
    const label = rejectionCategory({ rejectionCode: reason.code }).label;
    const entry = grouped.get(label) ?? { codes: [], count: 0 };
    entry.codes.push(reason.code);
    entry.count += reason.count;
    grouped.set(label, entry);
  }

  const tabs = [
    { key: 'all', label: t('rejected.allReasons'), count: total },
    ...[...grouped.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([label, entry]) => ({ key: entry.codes.join(','), label, count: entry.count })),
  ];

  return (
    <PageContainer
      title={t('rejected.title')}
      subtitle={t('rejected.subtitle')}
      action={(
        <Button
          variant="outlined"
          size="small"
          startIcon={<IconDownload size={14} stroke={1.6} />}
          onClick={() => void exportCsv()}
          disabled={exporting || !rows?.total}
        >
          {exporting ? t('rejected.exporting') : t('rejected.export')}
        </Button>
      )}
    >
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2.875}>
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            size="small"
            variant={tab.key === code ? 'contained' : 'outlined'}
            onClick={() => { setCode(tab.key); setPage(1); }}
          >
            {tab.label}
            <Typography component="span" sx={{ ...monoSx, ml: 1.125, color: 'inherit', opacity: 0.75 }}>
              {tab.count}
            </Typography>
          </Button>
        ))}
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} mb={1.75}>
        <TextField
          size="small"
          placeholder={t('rejected.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><IconSearch size={16} stroke={1.6} /></InputAdornment>
              ),
            },
            htmlInput: { 'aria-label': t('rejected.search') },
          }}
          sx={{ flex: 1 }}
        />
        {stats?.lastRun ? (
          <Typography variant="label" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {t('rejected.lastPass', {
              date: `${dayLabel(stats.lastRun.startedAt)} ${formatTime(stats.lastRun.startedAt)}`,
            })}
          </Typography>
        ) : null}
      </Stack>

      {rows ? (
        <Typography variant="label" color="text.secondary" sx={{ display: 'block', mb: 1.75 }}>
          {t('rejected.count', { count: rows.total })}
        </Typography>
      ) : null}

      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      {!rows && !error ? (
        <Box sx={{ minHeight: 'max(240px, calc(100vh - 320px))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : null}

      {rows && rows.items.length === 0 ? (
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={1.5}
          sx={{ minHeight: 320, border: 1, borderColor: 'divider', borderRadius: 1, px: 3, textAlign: 'center' }}
        >
          <IconFilterOff size={30} stroke={1.3} style={{ opacity: 0.5 }} />
          <Typography sx={{ fontSize: 16, fontWeight: 500, mt: 0.625 }}>{t('rejected.noMatch')}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{t('rejected.noMatch.hint')}</Typography>
        </Stack>
      ) : null}

      {rows && rows.items.length > 0 ? (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('rejected.col.record')}</TableCell>
                  <TableCell>{t('rejected.col.job')}</TableCell>
                  <TableCell>{t('rejected.col.reason')}</TableCell>
                  <TableCell>{t('rejected.col.source')}</TableCell>
                  <TableCell>{t('rejected.col.date')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.items.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography component="span" sx={monoSx}>{`REJ-${job.id}`}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12 }}>{job.title ?? t('card.untitled')}</Typography>
                      <Typography component="span" sx={{ ...monoSx, display: 'block', mt: 0.625 }}>
                        {job.company ?? job.author ?? ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <AppChip label={rejectionCategory(job).label} tone={rejectionCategory(job).tone} />
                      <Typography component="span" sx={{ ...monoSx, display: 'block', mt: 0.625 }}>
                        {rejectionText(job)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ whiteSpace: 'nowrap' }}>
                        <PlatformIcon label={jobSourceLabel(job.source)} />
                        <Typography component="span" sx={{ fontSize: 12 }}>{jobSourceLabel(job.source)}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography component="span" sx={monoSx}>
                        {`${dayLabel(job.foundAt)} · ${formatTime(job.foundAt)}`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            sx={{ px: 2.25, py: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
          >
            <Typography component="span" sx={monoSx}>
              {t('rejected.footer.left', { count: rows.total })}
            </Typography>
            <Typography component="span" sx={monoSx}>{t('rejected.footer.right')}</Typography>
          </Stack>
        </Box>
      ) : null}

      {rows ? (
        <AppPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={rows.total}
          onChange={setPage}
          noun={t('dash.tile.rejected')}
        />
      ) : null}
    </PageContainer>
  );
};

export default RejectedPage;
