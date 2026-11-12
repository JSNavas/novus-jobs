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
import { runStatusLabel, runStatusTone } from '../../../../views/dashboard/runStatus';
import { INBOX_VIEWS, showsCount, titleOf } from '../../../../views/jobs/inbox';
import { t } from '../../../../i18n';
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
  /**
   * El menú NO sabe qué plataformas hay: se las pregunta al servidor.
   *
   * Es la misma regla que en el resto del proyecto —solo `JOB_SOURCES` conoce
   * el catálogo— llevada hasta la navegación. Enchufar InfoJobs mañana le pone
   * su entrada aquí sin que nadie edite este fichero.
   */
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      // Un contador que no carga no es motivo para romper la navegación: el
      // menú tiene que seguir funcionando aunque la API no conteste.
      getStats().then((next) => { if (!cancelled) setStats(next); }).catch(() => undefined);
      listIntegrations().then((next) => { if (!cancelled) setIntegrations(next); }).catch(() => undefined);
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

      {/* The filter's archive. Kept apart from the inbox because it is not pending
          work: it is what you check when you suspect it discarded something good. */}
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
          <ListItemText primary={t('nav.focus')} />
          {/* Lo que apareció desde la última vez que entró. Sin esto, una
              tendencia nueva solo se descubre abriendo la página a ver si
              acaso — que es pedirle que recuerde cómo estaba la lista. */}
          {stats?.focusNew ? <AppChip label={String(stats.focusNew)} tone="success" /> : null}
        </ListItemButton>
      </List>

      {/* INTEGRACIONES: una entrada por plataforma montada, con su horario.
          Van juntas y aparte de Configuración porque lo que se ajusta aquí no
          es cómo se comporta la aplicación, sino el trato con un tercero. */}
      {integrations.length ? (
        <List
          sx={{ px: 2 }}
          subheader={<ListSubheader disableSticky sx={{ bgcolor: 'transparent', px: 1 }}>{t('nav.group.integrations')}</ListSubheader>}
        >
          {integrations.map((integration) => (
            <ListItemButton
              key={integration.name}
              component={NavLink}
              to={`/integraciones/${integration.name}`}
              end
              onClick={onNavigate}
              sx={{ borderRadius: 1, mb: 0.5, '&.active': { bgcolor: 'primary.light', color: 'primary.main' } }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                <IconPlug size="20" stroke={1.5} />
              </ListItemIcon>
              <ListItemText
                primary={integration.label}
                secondary={integration.schedule.kind === 'every-minutes'
                  ? t('schedule.everyMinutes', { minutes: integration.schedule.minutes })
                  : t('schedule.slots', { count: integration.schedule.hours.length })}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItemButton>
          ))}
        </List>
      ) : null}

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
