import { List, ListItemButton, ListItemIcon, ListItemText, ListSubheader } from '@mui/material';
import {
  IconArchive, IconBookmark, IconEye, IconFilterOff, IconInbox, IconLayoutDashboard, IconSettings, IconTargetArrow,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { NavLink } from 'react-router';
import { getStats, type Stats } from '../../../../api/client';
import { AppChip, AppStatusPilot } from '../../../../components/ui';
import { useEffect, useState } from 'react';
import { JobStatus } from '../../../../types';
import { runStatusLabel, runStatusTone } from '../../../../views/dashboard/runStatus';
import { INBOX_VIEWS, showsCount } from '../../../../views/jobs/inbox';
import NextSearchIndicator from './NextSearchIndicator';

/**
 * The menu IS the inbox map: one entry per status, each with its counter.
 *
 * It used to be a single entry with the statuses hidden in a filter dropdown.
 * That forces you to remember the filter exists in order to revisit what you
 * saved, and a list that is not visible from the menu is a list nobody visits.
 * The counter beside each entry answers "do I have anything there?" without entering it.
 */
const ICONS: Record<string, TablerIcon> = {
  '/nuevas': IconInbox,
  '/vistas': IconEye,
  '/guardadas': IconBookmark,
  '/descartadas': IconArchive,
};

/** How often the counters refresh. Same cadence as the dashboard. */
const POLL_INTERVAL_MS = 15_000;

interface SidebarItemsProps {
  onNavigate: () => void;
}

const SidebarItems = ({ onNavigate }: SidebarItemsProps) => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      // Un contador que no carga no es motivo para romper la navegación: el
      // menú tiene que seguir funcionando aunque la API no conteste.
      getStats().then((next) => { if (!cancelled) setStats(next); }).catch(() => undefined);
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
      {/* The dashboard sits OUTSIDE the "Ofertas" group and comes first: it is not
          a list of offers, it is the summary of what the searcher did, and the
          answer to "I have no information" when the inbox is empty. */}
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
          <ListItemText primary="Dashboard" />
          {stats?.lastRun ? (
            <AppStatusPilot tone={runStatusTone(stats.lastRun)} srLabel={runStatusLabel(stats.lastRun)} />
          ) : null}
        </ListItemButton>
        <NextSearchIndicator lastRunFailed={lastRunFailed} />
      </List>

    <List sx={{ px: 2 }} subheader={<ListSubheader disableSticky sx={{ bgcolor: 'transparent', px: 1 }}>Ofertas</ListSubheader>}>
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
            <ListItemText primary={view.title} />
            {count ? (
              <AppChip label={String(count)} tone={view.status === JobStatus.New ? 'success' : 'neutral'} />
            ) : null}
          </ListItemButton>
        );
      })}
    </List>

      {/* The filter's archive. Kept apart from the inbox because it is not pending
          work: it is what you check when you suspect it discarded something good. */}
      <List sx={{ px: 2 }} subheader={<ListSubheader disableSticky sx={{ bgcolor: 'transparent', px: 1 }}>Auditoría</ListSubheader>}>
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
          <ListItemText primary="Descartadas por el filtro" />
          {stats?.rejected ? <AppChip label={String(stats.rejected)} tone="neutral" /> : null}
        </ListItemButton>
      </List>

      {/* El enfoque va con la auditoría y no con las bandejas: no es trabajo
          pendiente, es qué dicen en conjunto las ofertas que entraron. */}
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
          <ListItemText primary="Enfoque" />
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
          <ListItemText primary="Configuración" />
        </ListItemButton>
      </List>
    </>
  );
};

export default SidebarItems;
