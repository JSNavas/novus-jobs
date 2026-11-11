import { List, ListItemButton, ListItemIcon, ListItemText, ListSubheader } from '@mui/material';
import {
  IconArchive, IconBookmark, IconEye, IconFilterOff, IconInbox, IconLayoutDashboard,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { NavLink } from 'react-router';
import { getStats, type Stats } from '../../../../api/client';
import { AppChip } from '../../../../components/ui';
import { useEffect, useState } from 'react';
import { JobStatus } from '../../../../types';
import { INBOX_VIEWS, showsCount } from '../../../../views/jobs/inbox';

/**
 * El menú ES el mapa de la bandeja: una entrada por estado, con su contador.
 *
 * Antes había una sola entrada y los estados vivían en un desplegable de
 * filtros. Eso obliga a recordar que el filtro existe para volver a ver lo que
 * guardaste, y una lista que no se ve desde el menú es una lista que no se
 * visita. El contador al lado responde "¿tengo algo ahí?" sin entrar.
 */
const ICONS: Record<string, TablerIcon> = {
  '/nuevas': IconInbox,
  '/vistas': IconEye,
  '/guardadas': IconBookmark,
  '/descartadas': IconArchive,
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

  const countOf = (view: (typeof INBOX_VIEWS)[number]): number | null => {
    if (!stats || !showsCount(view)) return null;
    return stats.byStatus[view.status];
  };

  return (
    <>
      {/* El dashboard va FUERA del grupo "Ofertas" y primero: no es una lista
          de ofertas, es el resumen de lo que ha hecho el buscador, y es la
          respuesta a "no tengo información" cuando la bandeja está vacía. */}
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
        </ListItemButton>
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

      {/* El archivo del filtro. Separado de la bandeja porque no es trabajo
          pendiente: es lo que se mira cuando sospechas que tiró algo bueno. */}
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
    </>
  );
};

export default SidebarItems;
