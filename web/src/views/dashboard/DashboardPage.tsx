import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box, Button, CircularProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { IconRefresh } from '@tabler/icons-react';
import { listRuns, PAGE_SIZE, startRun, type Stats } from '../../api/client';
import { useNotifications } from '../../notifications';
import { AppAlert, AppPagination, AppStatusPilot, BlankCard, PageContainer } from '../../components/ui';
import { t } from '../../i18n';
import { formatDateTime } from '../../format';
import { RunStatus, type RunInfo } from '../../types';
import { runStatusLabel, runStatusTone } from './runStatus';

const POLL_INTERVAL_MS = 15_000;

interface Tile {
  label: string;
  value: number;
  hint: string;
  to: string;
  tone: 'success' | 'neutral';
  audit?: boolean;
}

const tilesOf = (stats: Stats): Tile[] => [
  {
    label: t('dash.tile.new'),
    value: stats.new,
    hint: t('dash.tile.new.hint'),
    to: '/nuevas',
    tone: 'success',
  },
  {
    label: t('dash.tile.seen'),
    value: stats.byStatus.seen,
    hint: t('dash.tile.seen.hint'),
    to: '/vistas',
    tone: 'neutral',
  },
  {
    label: t('dash.tile.saved'),
    value: stats.byStatus.saved,
    hint: t('dash.tile.saved.hint'),
    to: '/guardadas',
    tone: 'neutral',
  },
  {
    label: t('dash.tile.dismissed'),
    value: stats.byStatus.dismissed,
    hint: t('dash.tile.dismissed.hint'),
    to: '/descartadas',
    tone: 'neutral',
  },
  {
    label: t('dash.tile.rejected'),
    value: stats.rejected,
    hint: t('dash.tile.rejected.hint'),
    to: '/rechazadas',
    tone: 'neutral',
    audit: true,
  },
];

const failedRowSx = {
  bgcolor: 'error.light',
  '& > td:first-of-type': { borderLeft: 3, borderLeftColor: 'error.main' },
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { stats, latest, notices, push, refresh } = useNotifications();
  const [searching, setSearching] = useState(false);
  const noticesAtStart = useRef(0);
  const [runs, setRuns] = useState<RunInfo[] | null>(null);
  const [runsTotal, setRunsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      listRuns(PAGE_SIZE, (page - 1) * PAGE_SIZE)
        .then((nextRuns) => {
          if (cancelled) return;
          setRuns(nextRuns.items);
          setRunsTotal(nextRuns.total);
          setError(null);
        })
        .catch((cause: unknown) => {
          if (!cancelled) setError(cause instanceof Error ? cause.message : 'Error desconocido');
        });
    };
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [page, notices.length]);

  useEffect(() => {
    if (!searching) return;
    const poll = setInterval(refresh, 2_000);
    const giveUp = setTimeout(() => setSearching(false), 120_000);
    return () => { clearInterval(poll); clearTimeout(giveUp); };
  }, [searching, refresh]);

  useEffect(() => {
    if (searching && notices.length > noticesAtStart.current) setSearching(false);
  }, [notices.length, searching]);

  const search = (): void => {
    noticesAtStart.current = notices.length;
    setSearching(true);
    startRun().catch((cause: unknown) => {
      setSearching(false);
      push({
        tone: 'error',
        title: t('notice.runFailed'),
        detail: cause instanceof Error ? cause.message : t('run.unknownError'),
        at: new Date().toISOString(),
      });
    });
  };

  return (
    <PageContainer
      title={t('dash.title')}
      subtitle={t('dash.subtitle')}
      action={(
        <Button
          variant="outlined"
          size="small"
          startIcon={<IconRefresh size={14} stroke={1.6} />}
          onClick={search}
          disabled={searching}
        >
          {searching ? t('dash.searching') : t('dash.searchNow')}
        </Button>
      )}
    >
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      {latest ? (
        <Box mb={2}>
          <AppAlert severity={latest.tone}>
            <Typography variant="body2" component="span" fontWeight={600}>{latest.title}</Typography>
            {latest.detail ? <Typography variant="body2" component="span">{` ${latest.detail}`}</Typography> : null}
          </AppAlert>
        </Box>
      ) : null}

      {!stats && !error ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : null}

      {stats ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          {tilesOf(stats).map((tile) => (
            <BlankCard key={tile.label} dashed={tile.audit} onClick={() => void navigate(tile.to)}>
              <Box p={2.5}>
                <Typography variant="overline" component="div" color="textSecondary">{tile.label}</Typography>
                <Typography variant="metric" component="div" mt={1.5} color={tile.tone === 'success' && tile.value > 0 ? 'success.main' : 'textPrimary'}>
                  {tile.value}
                </Typography>
                <Typography variant="caption" component="div" color="textSecondary" mt={1}>{tile.hint}</Typography>
              </Box>
            </BlankCard>
          ))}
        </Box>
      ) : null}

      <Typography variant="h6" mb={1}>{t('dash.runs')}</Typography>
      <Typography variant="body2" color="textSecondary" mb={2}>
        {t('dash.runs.help')}
      </Typography>

      <BlankCard>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('dash.runs.when')}</TableCell>
              <TableCell align="right">{t('dash.runs.read')}</TableCell>
              <TableCell align="right">{t('dash.runs.accepted')}</TableCell>
              <TableCell align="right">{t('dash.runs.rejected')}</TableCell>
              <TableCell>{t('dash.runs.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs?.map((run) => (
              <TableRow
                key={run.id}
                hover
                onClick={() => void navigate(`/busquedas/${run.id}`)}
                sx={{ cursor: 'pointer', ...(run.status === RunStatus.Error ? failedRowSx : undefined) }}
              >
                <TableCell>
                  <Typography variant="mono" component="span">{formatDateTime(run.startedAt)}</Typography>
                </TableCell>
                <TableCell align="right">{run.fetched}</TableCell>
                <TableCell align="right">{run.accepted}</TableCell>
                <TableCell align="right">{run.rejected}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AppStatusPilot label={runStatusLabel(run)} tone={runStatusTone(run)} />
                    {run.error ? (
                      <Typography variant="caption" color="textSecondary" noWrap sx={{ maxWidth: 320 }}>
                        {run.error}
                      </Typography>
                    ) : null}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {runs && runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="textSecondary" py={2} textAlign="center">
                    {t('dash.runs.empty')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </BlankCard>

      <AppPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={runsTotal}
        onChange={setPage}
        noun={t('dash.runs.noun')}
      />
    </PageContainer>
  );
};

export default DashboardPage;
