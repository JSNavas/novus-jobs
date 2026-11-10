import { List, ListItemButton, ListItemIcon, ListItemText, ListSubheader } from '@mui/material';
import {
  IconArchive, IconBookmark, IconEye, IconInbox, IconLayoutList, type Icon as TablerIcon,
} from '@tabler/icons-react';
import { NavLink } from 'react-router';
import { getStats, type Stats } from '../../../../api/client';
import { AppChip } from '../../../../components/ui';
import { useEffect, useState } from 'react';
import { JobStatus } from '../../../../types';
import { INBOX_VIEWS } from '../../../../views/jobs/inbox';

/**
 * El menú ES el mapa de la bandeja: una entrada por estado, con su contador.
 *
 * Antes había una sola entrada y los estados vivían en un desplegable de
 * filtros. Eso obliga a recordar que el filtro existe para volver a ver lo que
 * guardaste, y una lista que no se ve desde el menú es una lista que no se
 * visita. El contador al lado responde "¿tengo algo ahí?" sin entrar.
 */
const ICONS: Record<string, TablerIcon> = {
  '/': IconInbox,
  '/vistas': IconEye,
  '/guardadas': IconBookmark,
  '/descartadas': IconArchive,
  '/todas': IconLayoutList,
};

/** Cada cuánto se refrescan los contadores. El mismo ritmo que el dashboard. */
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

  const countOf = (status: JobStatus | null): number | null => {
    if (!stats) return null;
    return status ? stats.byStatus[status] : stats.total;
  };

  return (
    <List sx={{ px: 2 }} subheader={<ListSubheader disableSticky sx={{ bgcolor: 'transparent', px: 1 }}>Ofertas</ListSubheader>}>
      {INBOX_VIEWS.map((view) => {
        const Icon = ICONS[view.path] ?? IconInbox;
        const count = countOf(view.status);
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
  );
};

export default SidebarItems;
