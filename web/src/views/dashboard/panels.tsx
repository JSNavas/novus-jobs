import { Box, Stack, Typography } from '@mui/material';
import { IconArrowRight } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import type { CandidateProfile, Integration, Stats } from '../../api/client';
import { AppChip, AppStatusPilot } from '../../components/ui';
import { formatTime } from '../../format';
import { t } from '../../i18n';

const detailSx = {
  display: 'block',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 10,
  color: 'text.secondary',
} as const;

export const PlatformIcon = ({ label }: { label: string }) => (
  <Box
    aria-hidden
    sx={{
      width: 20, height: 20, flexShrink: 0, border: 1, borderColor: 'divider', borderRadius: 1,
      bgcolor: 'grey.300', color: 'text.primary', display: 'inline-flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 11, fontWeight: 600,
    }}
  >
    {label.slice(0, 1)}
  </Box>
);

export const PanelLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Stack
    component={NavLink}
    to={to}
    direction="row"
    spacing={1}
    alignItems="center"
    sx={{
      fontSize: 11, color: 'text.secondary', textDecoration: 'none',
      '&:hover': { color: 'primary.main' },
    }}
  >
    <span>{children}</span>
    <IconArrowRight size={13} stroke={1.6} />
  </Stack>
);

export const SidePanel = ({ title, link, children }: { title: string; link?: ReactNode; children: ReactNode }) => (
  <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', p: 2.25, mb: 2 }}>
    <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: 12, mb: 2.25 }}>
      {title}
    </Typography>
    {children}
    {link ? (
      <>
        <Box sx={{ height: '1px', bgcolor: 'divider', mt: 2.25, mb: 1.5 }} />
        {link}
      </>
    ) : null}
  </Box>
);

export const PlatformsPanel = ({ integrations }: { integrations: Integration[] }) => (
  <SidePanel
    title={t('dash.panel.platforms')}
    link={<PanelLink to="/integraciones">{t('dash.panel.integrations.link')}</PanelLink>}
  >
    {integrations.map((integration, index) => (
      <Box key={integration.name} sx={{ mt: index === 0 ? 0 : 2.25 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PlatformIcon label={integration.label} />
          <Typography variant="body2" sx={{ fontSize: 12, flex: 1, minWidth: 0 }}>{integration.label}</Typography>
          <Box sx={{ flexShrink: 0 }}>
            <AppStatusPilot
              tone={integration.enabled ? 'success' : 'neutral'}
              label={integration.enabled ? t('dash.platform.on') : t('dash.platform.off')}
            />
          </Box>
        </Stack>
        <Typography component="span" sx={{ ...detailSx, mt: 0.875, ml: 3.5 }}>
          {integration.lastRunAt
            ? t('dash.platform.last', { time: formatTime(integration.lastRunAt) })
            : t('dash.platform.never')}
          {integration.needsLogin ? ` · ${t('dash.platform.account')}` : ''}
        </Typography>
      </Box>
    ))}
  </SidePanel>
);

const LegendLine = ({ filled, label, value }: { filled: boolean; label: string; value: number }) => (
  <Stack direction="row" spacing={0.875} alignItems="center" sx={{ mt: 1.25 }}>
    <Box sx={{ width: 6, height: 6, flexShrink: 0, bgcolor: filled ? 'primary.main' : 'divider' }} />
    <Typography component="span" sx={{ ...detailSx, fontSize: 10, flex: 1, minWidth: 0 }}>{label}</Typography>
    <Typography variant="mono" sx={{ fontSize: '0.6875rem', flexShrink: 0, color: 'text.primary' }}>{value}</Typography>
  </Stack>
);

export const FilterPanel = ({ stats }: { stats: Stats }) => {
  const run = stats.lastRun;
  const read = run?.fetched ?? 0;
  const decided = run ? run.accepted + run.rejected : 0;
  const alreadySeen = Math.max(0, read - decided);
  const share = read > 0 && run ? run.accepted / read : 0;

  return (
    <SidePanel
      title={t('dash.panel.filter')}
      link={<PanelLink to="/rechazadas">{t('dash.panel.audit.link')}</PanelLink>}
    >
      {!run || read === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
          {t('dash.filter.none')}
        </Typography>
      ) : (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
              {t('dash.filter.read')}
            </Typography>
            <Typography variant="mono" sx={{ fontSize: '0.6875rem' }}>{read}</Typography>
          </Stack>

          <Box sx={{ height: 5, bgcolor: 'divider', mt: 1.875, mb: 2.25 }}>
            <Box sx={{ width: `${Math.round(share * 100)}%`, height: '100%', bgcolor: 'primary.main' }} />
          </Box>

          <LegendLine filled label={t('dash.filter.matched')} value={run.accepted} />
          <LegendLine filled={false} label={t('dash.filter.rejected')} value={run.rejected} />
          {alreadySeen > 0 ? (
            <LegendLine filled={false} label={t('dash.filter.alreadySeen')} value={alreadySeen} />
          ) : null}
        </>
      )}
    </SidePanel>
  );
};

const distinct = (items: readonly string[]): string[] => {
  const key = (item: string): string => item.toLowerCase().replace(/[.\s_-]/g, '');
  const kept: string[] = [];
  for (const item of items) {
    const k = key(item);
    const alias = kept.some((other) => {
      const o = key(other);
      return o === k || o.startsWith(k) || k.startsWith(o);
    });
    if (!alias) kept.push(item);
  }
  return kept;
};

export const CriteriaPanel = ({ profile, country }: { profile: CandidateProfile; country: string }) => {
  const modality = [
    profile.modality.remoteGlobal ? t('dash.criteria.remoteGlobal') : null,
    profile.modality.remoteHomeCountry ? t('dash.criteria.remoteHome') : null,
    profile.modality.hybrid ? t('dash.criteria.hybrid') : null,
    profile.modality.onsite ? t('dash.criteria.onsite') : null,
  ].filter(Boolean).join(' · ');

  return (
    <SidePanel
      title={t('dash.panel.criteria')}
      link={<PanelLink to="/configuracion">{t('dash.panel.profile.link')}</PanelLink>}
    >
      <Stack direction="row" spacing={0.875} useFlexGap flexWrap="wrap">
        {distinct(profile.core).slice(0, 4).map((tech) => <AppChip key={tech} label={tech} />)}
      </Stack>
      <Typography component="span" sx={{ ...detailSx, mt: 1.875, lineHeight: 1.8 }}>
        {country}
        {modality ? ` · ${modality}` : ''}
        <br />
        {t('dash.criteria.english', { level: profile.english.level.toUpperCase() })}
      </Typography>
    </SidePanel>
  );
};
