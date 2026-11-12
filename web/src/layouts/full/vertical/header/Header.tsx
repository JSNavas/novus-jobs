import { t } from '../../../../i18n';
import { AppBar, Badge, Box, IconButton, Stack, Toolbar, Tooltip, Typography } from '@mui/material';
import { IconBell, IconMenu2 } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { getStats, type Stats } from '../../../../api/client';
import { AppStatusPilot } from '../../../../components/ui';
import { utcOffsetLabel } from '../../../../format';
import { runStatusTone } from '../../../../views/dashboard/runStatus';

const POLL_INTERVAL_MS = 15_000;

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      getStats().then((next) => { if (!cancelled) setStats(next); }).catch(() => undefined);
    };
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const failed = stats?.lastRun ? runStatusTone(stats.lastRun) === 'error' : false;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{ bgcolor: 'background.default', color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}
    >
      <Toolbar variant="dense">
        <IconButton aria-label={t('header.openMenu')} onClick={onMenuClick} sx={{ mr: 1, display: { sm: 'none' } }}>
          <IconMenu2 size="20" />
        </IconButton>
        <Typography variant="overline" color="textSecondary">
          {t('app.name')}
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={2} alignItems="center">
          {stats?.lastRun ? (
            <AppStatusPilot
              tone={failed ? 'error' : 'success'}
              label={failed ? t('sidebar.lastRunFailed') : t('header.searcherActive')}
            />
          ) : null}

          <Box sx={{ width: '1px', height: 14, bgcolor: 'divider' }} />

          <Typography variant="label" color="text.secondary">
            {utcOffsetLabel()}
          </Typography>

          <Tooltip title={t('header.newPostings')}>
            <IconButton component={NavLink} to="/nuevas" aria-label={t('header.newPostings')} size="small">
              <Badge
                badgeContent={stats?.new ?? 0}
                max={999}
                color="success"
                slotProps={{ badge: { style: { fontSize: 9, height: 15, minWidth: 15 } } }}
              >
                <IconBell size={18} stroke={1.6} />
              </Badge>
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
