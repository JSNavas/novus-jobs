import { Box, Stack, Typography } from '@mui/material';
import { IconClock } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { getSchedule, type Schedule } from '../../../../api/client';
import {
  countdownOf, elapsedShare, nextSearchAt, nextSearchIn, searchHourLabel,
} from '../../../../views/jobs/scheduleText';
import { t } from '../../../../i18n';

const REFRESH_INTERVAL_MS = 30_000;
const TICK_INTERVAL_MS = 1_000;

interface NextSearchIndicatorProps {
  lastRunFailed: boolean;
  platforms: number;
}

const NextSearchIndicator = ({ lastRunFailed, platforms }: NextSearchIndicatorProps) => {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    getSchedule().then((next) => { if (!cancelled) setSchedule(next); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const tick = (): void => {
      if (document.visibilityState !== 'visible') return;
      setNow(new Date());
    };
    const refresh = (): void => {
      if (document.visibilityState !== 'visible') return;
      setNow(new Date());
      getSchedule().then(setSchedule).catch(() => undefined);
    };
    const ticker = setInterval(tick, TICK_INTERVAL_MS);
    const refresher = setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(ticker);
      clearInterval(refresher);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const next = schedule
    ? (schedule.nextAt ? nextSearchAt(schedule.nextAt, now) : nextSearchIn(schedule.hours, now))
    : null;
  if (!next && !lastRunFailed) return null;

  const share = next && schedule ? elapsedShare(schedule.hours, next) : null;

  return (
    <Box sx={{ m: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.default' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="label" color="text.secondary">
          {t('sidebar.nextSearch')}
        </Typography>
        <IconClock size={14} stroke={1.6} />
      </Stack>

      {lastRunFailed ? (
        <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600, mt: 1 }}>
          {t('sidebar.lastRunFailed')}
        </Typography>
      ) : null}

      {next ? (
        <>
          <Typography
            variant="metric"
            component="p"
            sx={{ fontSize: '1.5rem', my: 1, color: lastRunFailed ? 'text.secondary' : 'text.primary' }}
          >
            {countdownOf(next.secondsLeft)}
          </Typography>

          <Typography variant="label" sx={{ color: 'text.secondary', display: 'block' }}>
            {searchHourLabel(next.hour)}
            {platforms ? ` · ${t('nav.integrations.count', { count: platforms })}` : ''}
          </Typography>

          {share === null ? null : (
            <Box sx={{ mt: 1.5, height: 2, bgcolor: 'grey.200' }}>
              <Box sx={{ width: `${Math.round(share * 100)}%`, height: '100%', bgcolor: 'primary.main' }} />
            </Box>
          )}
        </>
      ) : null}
    </Box>
  );
};

export default NextSearchIndicator;
