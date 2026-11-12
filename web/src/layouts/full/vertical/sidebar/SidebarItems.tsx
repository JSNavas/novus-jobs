import { Badge, Box, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Tooltip } from '@mui/material';
import {
  IconArchive, IconBookmark, IconEye, IconFilterOff, IconInbox, IconLayoutDashboard, IconPlug, IconSettings,
  IconTargetArrow,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { NavLink } from 'react-router';
import { listIntegrations, type Integration } from '../../../../api/client';
import { AppChip, AppStatusPilot } from '../../../../components/ui';
import { type ReactNode, useEffect, useState } from 'react';
import { JobStatus, RunStatus } from '../../../../types';
import { setSourceLabels } from '../../../../labels';
import { runStatusLabel, runStatusTone } from '../../../../views/dashboard/runStatus';
import { INBOX_VIEWS, showsCount, titleOf } from '../../../../views/jobs/inbox';
import { t } from '../../../../i18n';
import { useNotifications } from '../../../../notifications';
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

const railItemSx = { ...itemSx, px: 0, justifyContent: 'center' };

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
  collapsed?: boolean;
}

const SidebarItems = ({ onNavigate, collapsed = false }: SidebarItemsProps) => {
  const { stats } = useNotifications();
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
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

  const group = (labelKey: 'nav.group.monitor' | 'nav.group.offers' | 'nav.group.audit' | 'nav.group.system', children: ReactNode) => (
    <List
      sx={groupSx}
      subheader={collapsed ? undefined : <ListSubheader disableSticky sx={subheaderSx}>{t(labelKey)}</ListSubheader>}
    >
      {children}
    </List>
  );

  const item = (
    to: string,
    label: string,
    Icon: TablerIcon,
    options: { count?: number | null; tone?: 'success' | 'neutral'; trailing?: ReactNode } = {},
  ) => {
    const { count, tone = 'neutral', trailing } = options;
    const icon = <Icon size="19" stroke={1.6} />;

    const button = (
      <ListItemButton
        component={NavLink}
        to={to}
        end
        onClick={onNavigate}
        aria-label={collapsed ? label : undefined}
        sx={collapsed ? railItemSx : itemSx}
      >
        <ListItemIcon sx={{ minWidth: collapsed ? 0 : 32, color: 'inherit' }}>
          {collapsed && count ? (
            <Badge
              badgeContent={count}
              max={999}
              color={tone === 'success' ? 'success' : 'secondary'}
              slotProps={{
                badge: { style: { fontSize: 9, height: 15, minWidth: 15, transform: 'translate(90%, -45%)' } },
              }}
            >
              {icon}
            </Badge>
          ) : icon}
        </ListItemIcon>
        {collapsed ? null : (
          <ListItemText
            sx={labelSx}
            primary={(
              <>
                {count ? (
                  <Box component="span" sx={{ float: 'right', ml: 1, mt: '-1px' }}>
                    <AppChip label={String(count)} tone={tone} />
                  </Box>
                ) : null}
                {label}
              </>
            )}
          />
        )}
        {collapsed ? null : trailing}
      </ListItemButton>
    );

    if (!collapsed) return button;
    return <Tooltip key={to} title={label} placement="right">{button}</Tooltip>;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {group('nav.group.monitor', (
          <Box key="/">
            {item('/', t('nav.dashboard'), IconLayoutDashboard, {
              trailing: stats?.lastRun
                ? <AppStatusPilot tone={runStatusTone(stats.lastRun)} srLabel={runStatusLabel(stats.lastRun)} />
                : null,
            })}
          </Box>
        ))}

        {group('nav.group.offers', INBOX_VIEWS.map((view) => (
          <Box key={view.path}>
            {item(view.path, titleOf(view), ICONS[view.path] ?? IconInbox, {
              count: countOf(view),
              tone: view.status === JobStatus.New ? 'success' : 'neutral',
            })}
          </Box>
        )))}

        {group('nav.group.audit', (
          <Box key="audit">
            {item('/rechazadas', t('nav.rejected'), IconFilterOff, { count: stats?.rejected ?? null })}
            {item('/enfoque', t('nav.focus'), IconTargetArrow, { count: stats?.focusNew ?? null, tone: 'success' })}
          </Box>
        ))}

        {group('nav.group.system', (
          <Box key="system">
            {item('/integraciones', t('nav.group.integrations'), IconPlug)}
            {item('/configuracion', t('nav.settings'), IconSettings)}
          </Box>
        ))}
      </Box>

      {collapsed ? null : (
        <NextSearchIndicator
          lastRunFailed={lastRunFailed}
          lastRunAt={stats?.lastRun?.startedAt ?? null}
          platforms={integrations.length}
          running={stats?.lastRun?.status === RunStatus.Running}
        />
      )}
    </Box>
  );
};

export default SidebarItems;
