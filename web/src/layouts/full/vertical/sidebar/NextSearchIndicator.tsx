import { Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { getSchedule, type Schedule } from '../../../../api/client';
import { formatNextSearch, nextSearchAt, nextSearchIn } from '../../../../views/jobs/scheduleText';
import { t } from '../../../../i18n';

const TICK_INTERVAL_MS = 30_000;

interface NextSearchIndicatorProps {
  lastRunFailed: boolean;
}

const NextSearchIndicator = ({ lastRunFailed }: NextSearchIndicatorProps) => {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    getSchedule().then((next) => { if (!cancelled) setSchedule(next); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const refresh = (): void => {
      if (document.visibilityState !== 'visible') return;
      setNow(new Date());
      getSchedule().then(setSchedule).catch(() => undefined);
    };
    const timer = setInterval(refresh, TICK_INTERVAL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const next = schedule
    ? (schedule.nextAt ? nextSearchAt(schedule.nextAt, now) : nextSearchIn(schedule.hours, now))
    : null;
  if (!next && !lastRunFailed) return null;

  return (
    <Box component="li" sx={{ pl: 6.5, pr: 2, pb: 1 }}>
      {lastRunFailed ? (
        <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
          {t('sidebar.lastRunFailed')}
        </Typography>
      ) : null}
      {next ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {formatNextSearch(next)}
        </Typography>
      ) : null}
    </Box>
  );
};

export default NextSearchIndicator;
