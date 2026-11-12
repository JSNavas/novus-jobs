import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box, Button, CircularProgress, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, Typography,
} from '@mui/material';
import {
  IconArchive, IconArrowRight, IconBookmark, IconEye, IconFilterOff, IconInbox, IconRefresh,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import {
  getOnboarding, listIntegrations, listJobs, listRuns, PAGE_SIZE, startRun,
  type Integration, type OnboardingState, type Stats,
} from '../../api/client';
import { useNotifications } from '../../notifications';
import { AppAlert, AppChip, AppPagination, AppStatusPilot, BlankCard, PageContainer } from '../../components/ui';
import { t } from '../../i18n';
import { dayLabel, formatDate, formatTime } from '../../format';
import { RunStatus, type RunInfo } from '../../types';
import { runStatusLabel, runStatusTone } from './runStatus';
import { jobSourceLabel } from '../../labels';
import { JobStatus, type Job } from '../../types';
import { CriteriaPanel, FilterPanel, PanelLink, PlatformIcon, PlatformsPanel } from './panels';
import RecentJobs from './RecentJobs';

const POLL_INTERVAL_MS = 15_000;

interface Tile {
  label: string;
  value: number;
  hint: string;
  to: string;
  tone: 'success' | 'neutral';
  icon: TablerIcon;
  audit?: boolean;
}

const padded = (value: number): string => (value > 0 && value < 10 ? `0${value}` : String(value));

const tilesOf = (stats: Stats): Tile[] => [
  {
    label: t('dash.tile.new'),
    value: stats.new,
    hint: t('dash.tile.new.hint'),
    icon: IconInbox,
    to: '/nuevas',
    tone: 'success',
  },
  {
    label: t('dash.tile.seen'),
    value: stats.byStatus.seen,
    hint: t('dash.tile.seen.hint'),
    icon: IconEye,
    to: '/vistas',
    tone: 'neutral',
  },
  {
    label: t('dash.tile.saved'),
    value: stats.byStatus.saved,
    hint: t('dash.tile.saved.hint'),
    icon: IconBookmark,
    to: '/guardadas',
    tone: 'neutral',
  },
  {
    label: t('dash.tile.dismissed'),
    value: stats.byStatus.dismissed,
    hint: t('dash.tile.dismissed.hint'),
    icon: IconArchive,
    to: '/descartadas',
    tone: 'neutral',
  },
  {
    label: t('dash.tile.rejected'),
    value: stats.rejected,
    hint: t('dash.tile.rejected.hint'),
    icon: IconFilterOff,
    to: '/rechazadas',
    tone: 'neutral',
    audit: true,
  },
];

const durationOf = (run: RunInfo): string => {
  if (!run.finishedAt) return '—';
  const seconds = Math.max(0, Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
};

const sinceOf = (period: '48h' | 'today' | 'week' | 'all'): string | null => {
  if (period === 'all') return null;
  if (period === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  const hours = period === '48h' ? 48 : 24 * 7;
  return new Date(Date.now() - hours * 3_600_000).toISOString();
};

const failedRowSx = {
  bgcolor: 'error.light',
  '& > td:first-of-type': { borderLeft: 3, borderLeftColor: 'error.main' },
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { stats, latest, notices, unread, markRead, push, refresh } = useNotifications();
  const [searching, setSearching] = useState(false);
  const noticesAtStart = useRef(0);
  const [runs, setRuns] = useState<RunInfo[] | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [recent, setRecent] = useState<Job[]>([]);
  const [runsTotal, setRunsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<'48h' | 'today' | 'week' | 'all'>('48h');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      listRuns(PAGE_SIZE, (page - 1) * PAGE_SIZE, sinceOf(period))
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
  }, [page, period, notices.length]);

  useEffect(() => {
    let cancelled = false;
    listIntegrations().then((next) => { if (!cancelled) setIntegrations(next); }).catch(() => undefined);
    getOnboarding().then((next) => { if (!cancelled) setOnboarding(next); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listJobs({ status: JobStatus.New, limit: 3 })
      .then((page) => { if (!cancelled) setRecent(page.items); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [notices.length]);

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
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography
            component="span"
            sx={{
              display: { xs: 'none', md: 'block' },
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary',
            }}
          >
            {dayLabel(new Date().toISOString())}, {formatDate(new Date().toISOString())}
          </Typography>
          <Button
          variant="outlined"
          size="small"
          startIcon={<IconRefresh size={14} stroke={1.6} />}
          onClick={search}
          disabled={searching}
        >
            {searching ? t('dash.searching') : t('dash.searchNow')}
          </Button>
        </Stack>
      )}
    >
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      {latest && unread > 0 ? (
        <Box mb={2}>
          <AppAlert severity={latest.tone} onClose={markRead}>
            <Typography variant="body2" component="span" fontWeight={600}>{latest.title}</Typography>
            {latest.detail ? <Typography variant="body2" component="span">{` ${latest.detail}`}</Typography> : null}
          </AppAlert>
        </Box>
      ) : null}

      {!stats && !error ? (
        <Box sx={{ minHeight: 'max(240px, calc(100vh - 320px))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : null}

      {stats ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          {tilesOf(stats).map((tile) => (
            <BlankCard key={tile.label} dashed={tile.audit} onClick={() => void navigate(tile.to)}>
              <Box p={2.5}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                  <Typography variant="overline" component="div" color="textSecondary">{tile.label}</Typography>
                  <Box component={tile.icon} size={17} stroke={1.6} sx={{ color: 'text.secondary', flexShrink: 0 }} />
                </Stack>
                <Typography variant="metric" component="div" mt={1.5} color={tile.tone === 'success' && tile.value > 0 ? 'success.main' : 'textPrimary'}>
                  {padded(tile.value)}
                </Typography>
                <Typography variant="caption" component="div" color="textSecondary" mt={1}>{tile.hint}</Typography>
              </Box>
            </BlankCard>
          ))}
        </Box>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(0, 1fr) 248px',
            lg: 'minmax(0, 1fr) 280px',
            xl: 'minmax(0, 1fr) 300px',
          },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ minHeight: 39, mb: 1 }}>
            <Typography variant="h6" sx={{ fontSize: 14 }}>{t('dash.runs')}</Typography>
            <Select
              size="small"
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value as '48h' | 'today' | 'week' | 'all');
                setPage(1);
              }}
              inputProps={{ 'aria-label': t('dash.runs') }}
              sx={{ fontSize: 12 }}
            >
              <MenuItem value="48h">{t('dash.period.48h')}</MenuItem>
              <MenuItem value="today">{t('dash.period.today')}</MenuItem>
              <MenuItem value="week">{t('dash.period.week')}</MenuItem>
              <MenuItem value="all">{t('dash.period.all')}</MenuItem>
            </Select>
          </Stack>
          <Typography variant="body2" color="textSecondary" mb={2}>
            {t('dash.runs.help')}
          </Typography>

          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 680 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('dash.runs.when')}</TableCell>
                  <TableCell>{t('dash.runs.platform')}</TableCell>
                  <TableCell>{t('dash.runs.status')}</TableCell>
                  <TableCell align="right">{t('dash.runs.read')}</TableCell>
                  <TableCell align="right">{t('dash.runs.accepted')}</TableCell>
                  <TableCell align="right">{t('dash.runs.rejected')}</TableCell>
                  <TableCell align="right">{t('dash.runs.duration')}</TableCell>
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
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography component="span" sx={{ display: 'block', fontSize: 10, color: 'text.secondary', mb: 0.625 }}>
                        {dayLabel(run.startedAt)}
                      </Typography>
                      <Typography variant="mono" component="span">{formatTime(run.startedAt)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ whiteSpace: 'nowrap' }}>
                        <PlatformIcon label={jobSourceLabel(run.source)} />
                        <span>{jobSourceLabel(run.source)}</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <AppStatusPilot label={runStatusLabel(run)} tone={runStatusTone(run)} />
                        {run.error ? (
                          <Typography variant="caption" color="textSecondary" noWrap sx={{ maxWidth: 220 }}>
                            {run.error}
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="mono" component="span">{run.fetched}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="mono" component="span">{padded(run.accepted)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="mono" component="span">{run.rejected}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="mono" component="span" color="textSecondary">{durationOf(run)}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {runs && runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography color="textSecondary" py={2} textAlign="center">
                        {t('dash.runs.empty')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            </Box>

            {runsTotal > 0 ? (
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
                sx={{ px: 2.25, py: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
              >
                <Typography
                  component="span"
                  sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10, color: 'text.secondary' }}
                >
                  {t('dash.runs.footer', { count: runsTotal })}
                </Typography>
                {period === 'all' ? null : (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => { setPeriod('all'); setPage(1); }}
                    sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 1, border: 0, bgcolor: 'transparent',
                      cursor: 'pointer', p: 0, fontSize: 11, color: 'text.secondary', fontFamily: 'inherit',
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    {t('dash.runs.allHistory')}
                    <IconArrowRight size={13} stroke={1.6} />
                  </Box>
                )}
              </Stack>
            ) : null}
          </Box>

          <AppPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={runsTotal}
            onChange={setPage}
            noun={t('dash.runs.noun')}
          />

          <Box sx={{ mt: 2.75 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ minHeight: 39, mb: 1 }}>
              <Stack direction="row" spacing={1.125} alignItems="center">
                <Typography variant="h6" sx={{ fontSize: 14 }}>{t('dash.recent')}</Typography>
                {stats?.new ? <AppChip label={String(stats.new)} tone="success" /> : null}
              </Stack>
              <PanelLink to="/nuevas">{t('dash.recent.all')}</PanelLink>
            </Stack>
            <RecentJobs jobs={recent} />
          </Box>
        </Box>

        <Box component="aside" sx={{ minWidth: 0 }}>
          {integrations.length ? <PlatformsPanel integrations={integrations} /> : null}
          {stats ? <FilterPanel stats={stats} /> : null}
          {onboarding ? (
            <CriteriaPanel
              profile={onboarding.profile}
              country={
                onboarding.catalogue.countries.find((c) => c.code === onboarding.profile.geo.country)?.label
                ?? onboarding.profile.geo.country
              }
            />
          ) : null}
        </Box>
      </Box>

    </PageContainer>
  );
};

export default DashboardPage;
