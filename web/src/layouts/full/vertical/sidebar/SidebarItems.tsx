import { Box, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader } from '@mui/material';
import {
  IconArchive, IconBookmark, IconEye, IconFilterOff, IconInbox, IconLayoutDashboard, IconPlug, IconSettings,
  IconTargetArrow,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { NavLink } from 'react-router';
import { getStats, listIntegrations, type Integration, type Stats } from '../../../../api/client';
import { AppChip, AppStatusPilot } from '../../../../components/ui';
import { useEffect, useState } from 'react';
import { JobStatus } from '../../../../types';
import { setSourceLabels } from '../../../../labels';
import { runStatusLabel, runStatusTone } from '../../../../views/dashboard/runStatus';
import { INBOX_VIEWS, showsCount, titleOf } from '../../../../views/jobs/inbox';
import { t } from '../../../../i18n';
import NextSearchIndicator from './NextSearchIndicator';

const ICONS: Record<string, TablerIcon> = {
  '/nuevas': IconInbox,
  '/vistas': IconEye,
  '/guardadas': IconBookmark,
  '/descartadas': IconArchive,
};

const POLL_INTERVAL_MS = 15_000;

const itemSx = {
  minHeight: 38,
  px: 1.5,
  mb: 0.375,
  borderRadius: 1,
  border: 1,
  borderColor: 'transparent',
  color: 'text.secondary',
  transition: 'background-color 140ms',
  '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
  '&.active': { bgcolor: 'grey.300', borderColor: 'divider', color: 'primary.main' },
};

const groupSx = { px: 1.5, py: 0 };

const subheaderSx = {
  bgcolor: 'transparent',
  px: 1.5,
  pt: 2,
  pb: 1,
  lineHeight: 1,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

const labelSx = { my: 0, '& .MuiTypography-root': { fontSize: 13 } };

interface SidebarItemsProps {
  onNavigate: () => void;
}

const SidebarItems = ({ onNavigate }: SidebarItemsProps) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      getStats().then((next) => { if (!cancelled) setStats(next); }).catch(() => undefined);
      listIntegrations().then((next) => {
        if (cancelled) return;
        setIntegrations(next);
        setSourceLabels(next);
      }).catch(() => undefined);
    };
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const lastRunFailed = stats?.lastRun ? runStatusTone(stats.lastRun) === 'error' : false;

  const countOf = (view: (typeof INBOX_VIEWS)[number]): number | null => {
    if (!stats || !showsCount(view)) return null;
    return stats.byStatus[view.status];
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <List sx={groupSx} subheader={<ListSubheader disableSticky sx={subheaderSx}>{t('nav.group.monitor')}</ListSubheader>}>
          <ListItemButton component={NavLink} to="/" end onClick={onNavigate} sx={itemSx}>
            <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
              <IconLayoutDashboard size="19" stroke={1.6} />
            </ListItemIcon>
            <ListItemText primary={t('nav.dashboard')} sx={labelSx} />
            {stats?.lastRun ? (
              <AppStatusPilot tone={runStatusTone(stats.lastRun)} srLabel={runStatusLabel(stats.lastRun)} />
            ) : null}
          </ListItemButton>
        </List>

        <List sx={groupSx} subheader={<ListSubheader disableSticky sx={subheaderSx}>{t('nav.group.offers')}</ListSubheader>}>
          {INBOX_VIEWS.map((view) => {
            const Icon = ICONS[view.path] ?? IconInbox;
            const count = countOf(view);
            return (
              <ListItemButton key={view.path} component={NavLink} to={view.path} end onClick={onNavigate} sx={itemSx}>
                <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                  <Icon size="19" stroke={1.6} />
                </ListItemIcon>
                <ListItemText primary={titleOf(view)} sx={labelSx} />
                {count ? (
                  <AppChip label={String(count)} tone={view.status === JobStatus.New ? 'success' : 'neutral'} />
                ) : null}
              </ListItemButton>
            );
          })}
        </List>

        <List sx={groupSx} subheader={<ListSubheader disableSticky sx={subheaderSx}>{t('nav.group.audit')}</ListSubheader>}>
          <ListItemButton component={NavLink} to="/rechazadas" end onClick={onNavigate} sx={itemSx}>
            <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
              <IconFilterOff size="19" stroke={1.6} />
            </ListItemIcon>
            <ListItemText primary={t('nav.rejected')} sx={labelSx} />
            {stats?.rejected ? <AppChip label={String(stats.rejected)} tone="neutral" /> : null}
          </ListItemButton>
          <ListItemButton component={NavLink} to="/enfoque" end onClick={onNavigate} sx={itemSx}>
            <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
              <IconTargetArrow size="19" stroke={1.6} />
            </ListItemIcon>
            <ListItemText primary={t('nav.focus')} sx={labelSx} />
            {stats?.focusNew ? <AppChip label={String(stats.focusNew)} tone="success" /> : null}
          </ListItemButton>
        </List>

        <List sx={groupSx} subheader={<ListSubheader disableSticky sx={subheaderSx}>{t('nav.group.system')}</ListSubheader>}>
          <ListItemButton component={NavLink} to="/integraciones" end onClick={onNavigate} sx={itemSx}>
            <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
              <IconPlug size="19" stroke={1.6} />
            </ListItemIcon>
            <ListItemText
              primary={t('nav.group.integrations')}
              secondary={integrations.length ? t('nav.integrations.count', { count: integrations.length }) : undefined}
              sx={labelSx}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItemButton>
          <ListItemButton component={NavLink} to="/configuracion" end onClick={onNavigate} sx={itemSx}>
            <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
              <IconSettings size="19" stroke={1.6} />
            </ListItemIcon>
            <ListItemText primary={t('nav.settings')} sx={labelSx} />
          </ListItemButton>
        </List>
      </Box>

      <NextSearchIndicator lastRunFailed={lastRunFailed} />
    </Box>
  );
};

export default SidebarItems;
