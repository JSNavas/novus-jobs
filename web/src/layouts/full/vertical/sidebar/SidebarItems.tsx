import { List, ListItemButton, ListItemIcon, ListItemText, ListSubheader } from '@mui/material';
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
    <>
      <List sx={{ px: 2 }}>
        <ListItemButton
          component={NavLink}
          to="/"
          end
          onClick={onNavigate}
          sx={{ borderRadius: 1, mb: 0.5, '&.active': { bgcolor: 'primary.light', color: 'primary.main' } }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <IconLayoutDashboard size="20" stroke={1.5} />
          </ListItemIcon>
          <ListItemText primary={t('nav.dashboard')} />
          {stats?.lastRun ? (
            <AppStatusPilot tone={runStatusTone(stats.lastRun)} srLabel={runStatusLabel(stats.lastRun)} />
          ) : null}
        </ListItemButton>
        <NextSearchIndicator lastRunFailed={lastRunFailed} />
      </List>

    <List sx={{ px: 2 }} subheader={<ListSubheader disableSticky sx={{ bgcolor: 'transparent', px: 1 }}>{t('nav.group.offers')}</ListSubheader>}>
      {INBOX_VIEWS.map((view) => {
        const Icon = ICONS[view.path] ?? IconInbox;
        const count = countOf(view);
        return (
          <ListItemButton
            key={view.path}
            component={NavLink}
            to={view.path}
            end
            onClick={onNavigate}
            sx={{ borderRadius: 1, mb: 0.5, '&.active': { bgcolor: 'primary.light', color: 'primary.main' } }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
              <Icon size="20" stroke={1.5} />
            </ListItemIcon>
            <ListItemText primary={titleOf(view)} />
            {count ? (
              <AppChip label={String(count)} tone={view.status === JobStatus.New ? 'success' : 'neutral'} />
            ) : null}
          </ListItemButton>
        );
      })}
    </List>

      <List sx={{ px: 2 }} subheader={<ListSubheader disableSticky sx={{ bgcolor: 'transparent', px: 1 }}>{t('nav.group.audit')}</ListSubheader>}>
        <ListItemButton
          component={NavLink}
          to="/rechazadas"
          end
          onClick={onNavigate}
          sx={{ borderRadius: 1, mb: 0.5, '&.active': { bgcolor: 'primary.light', color: 'primary.main' } }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <IconFilterOff size="20" stroke={1.5} />
          </ListItemIcon>
          <ListItemText primary={t('nav.rejected')} />
          {stats?.rejected ? <AppChip label={String(stats.rejected)} tone="neutral" /> : null}
        </ListItemButton>
      </List>

      <List sx={{ px: 2 }}>
        <ListItemButton
          component={NavLink}
          to="/enfoque"
          end
          onClick={onNavigate}
          sx={{ borderRadius: 1, mb: 0.5, '&.active': { bgcolor: 'primary.light', color: 'primary.main' } }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <IconTargetArrow size="20" stroke={1.5} />
          </ListItemIcon>
          <ListItemText primary={t('nav.focus')} />
          {stats?.focusNew ? <AppChip label={String(stats.focusNew)} tone="success" /> : null}
        </ListItemButton>
      </List>

      <List sx={{ px: 2 }}>
        <ListItemButton
          component={NavLink}
          to="/integraciones"
          end
          onClick={onNavigate}
          sx={{ borderRadius: 1, mb: 0.5, '&.active': { bgcolor: 'primary.light', color: 'primary.main' } }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <IconPlug size="20" stroke={1.5} />
          </ListItemIcon>
          <ListItemText
            primary={t('nav.group.integrations')}
            secondary={integrations.length ? t('nav.integrations.count', { count: integrations.length }) : undefined}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItemButton>
      </List>

      <List sx={{ px: 2 }}>
        <ListItemButton
          component={NavLink}
          to="/configuracion"
          end
          onClick={onNavigate}
          sx={{ borderRadius: 1, mb: 0.5, '&.active': { bgcolor: 'primary.light', color: 'primary.main' } }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <IconSettings size="20" stroke={1.5} />
          </ListItemIcon>
          <ListItemText primary={t('nav.settings')} />
        </ListItemButton>
      </List>
    </>
  );
};

export default SidebarItems;
