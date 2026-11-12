import { Stack, Typography } from '@mui/material';
import { IconCheck, IconLock } from '@tabler/icons-react';
import { formatTime } from '../../format';
import { t } from '../../i18n';
import { useNotifications } from '../../notifications';

const monoSx = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 9,
  color: 'text.secondary',
} as const;

const AppFooter = () => {
  const { stats } = useNotifications();
  const syncedAt = stats?.lastRun?.finishedAt ?? stats?.lastRun?.startedAt ?? null;

  return (
    <Stack
      component="footer"
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={2}
      flexWrap="wrap"
      useFlexGap
      sx={{ mt: 3.75, pt: 2.125, pb: 2.125, borderTop: 1, borderColor: 'divider' }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.secondary' }}>
        <IconLock size={11} stroke={1.6} />
        <Typography component="span" sx={monoSx}>{t('footer.local')}</Typography>
      </Stack>

      {syncedAt ? (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.secondary' }}>
          <Typography component="span" sx={monoSx}>
            {t('footer.sync', { time: formatTime(syncedAt) })}
          </Typography>
          <IconCheck size={12} stroke={1.6} />
        </Stack>
      ) : null}
    </Stack>
  );
};

export default AppFooter;
