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
      sx={{
        height: 46,
        flexShrink: 0,
        px: { xs: 2, sm: 4 },
        borderTop: 1,
        borderColor: 'divider',
      }}
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
