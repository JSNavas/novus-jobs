import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { IconTrash } from '@tabler/icons-react';
import {
  Box, Button, CircularProgress, IconButton, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Tooltip,
  Typography,
} from '@mui/material';
import {
  deleteSource, listHiddenSources, listIntegrations, listSources, showHiddenSources,
  updateIntegrationEnabled, updateIntegrationSchedule, type Integration,
} from '../../api/client';
import { AppAlert, AppDialog, AppStatusPilot, BlankCard, PageContainer } from '../../components/ui';
import { PlatformIcon } from '../dashboard/panels';
import { t } from '../../i18n';
import { formatDateTime } from '../../format';
import { formatNextSearch, nextSearchAt } from '../jobs/scheduleText';
import {
  ALL_HOURS, hourLabel, INTERVAL_PRESETS, intervalError, intervalLabel,
} from './scheduleEditor';

const POLL_INTERVAL_MS = 30_000;

export interface CardProps {
  integration: Integration;
  onSaved: (next: Integration, message?: string) => void;
  onRemove?: () => void;
}

/** El editor que se enseña tras cambiar de modo sin guardar: nada se ha escrito todavía. */
export interface EditorProps extends CardProps {
  pending?: boolean;
  onCancel?: () => void;
}

export const IntervalEditor = ({ integration, onSaved, pending, onCancel }: EditorProps) => {
  const current = integration.schedule.kind === 'every-minutes' ? integration.schedule.minutes : 60;
  const [minutes, setMinutes] = useState(String(current));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMinutes(String(current)); }, [current]);

  const save = (value: number): void => {
    setSaving(true);
    setError(null);
    updateIntegrationSchedule(integration.name, { minutes: value })
      .then((next) => onSaved(next, t('int.saved', { name: integration.label })))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setSaving(false));
  };

  const invalid = intervalError(minutes);

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="textSecondary">
        {t(integration.needsLogin ? 'int.interval.help.account' : 'int.interval.help')}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {INTERVAL_PRESETS.map((preset) => (
          <ToggleButton
            key={preset}
            value={preset}
            size="small"
            selected={String(preset) === minutes}
            disabled={saving}
            onChange={() => setMinutes(String(preset))}
            sx={{ textTransform: 'none' }}
          >
            {intervalLabel(preset)}
          </ToggleButton>
        ))}
      </Stack>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          size="small"
          label={t('int.minutes')}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          error={Boolean(invalid)}
          helperText={invalid ?? ' '}
          sx={{ width: 104 }}
        />
        <Button
          variant="contained"
          disabled={saving || Boolean(invalid) || (!pending && Number(minutes) === current)}
          onClick={() => save(Number(minutes))}
          sx={{ mt: 0.5 }}
        >
          {t('int.save')}
        </Button>
        <Button
          variant="text"
          disabled={saving || (!pending && Number(minutes) === current)}
          onClick={() => { setMinutes(String(current)); onCancel?.(); }}
          sx={{ mt: 0.5 }}
        >
          {t('int.cancel')}
        </Button>
      </Stack>
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}
    </Stack>
  );
};

export const HoursEditor = ({ integration, onSaved, pending, onCancel }: EditorProps) => {
  const current = integration.schedule.kind === 'configured-hours' ? integration.schedule.hours : [];
  const [hours, setHours] = useState<number[]>(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setHours(current); }, [current.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (): void => {
    setSaving(true);
    setError(null);
    updateIntegrationSchedule(integration.name, { hours })
      .then((next) => onSaved(next, t('int.saved', { name: integration.label })))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setSaving(false));
  };

  const changed = hours.join(',') !== current.join(',');

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="textSecondary">
        {t('int.hours.help', { timezone: integration.timezone })}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 1 }}>
        {ALL_HOURS.map((hour) => {
          const on = hours.includes(hour);
          return (
            <ToggleButton
              key={hour}
              value={hour}
              selected={on}
              size="small"
              onChange={() => setHours((prev) => (
                on ? prev.filter((h) => h !== hour) : [...prev, hour].sort((a, b) => a - b)
              ))}
              sx={{ textTransform: 'none' }}
            >
              {hourLabel(hour)}
            </ToggleButton>
          );
        })}
      </Box>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button variant="contained" disabled={saving || (!pending && !changed) || hours.length === 0} onClick={save}>
          {t('int.save')}
        </Button>
        <Button variant="text" disabled={saving || (!pending && !changed)} onClick={() => { setHours(current); onCancel?.(); }}>
          {t('int.cancel')}
        </Button>
        {hours.length === 0 ? (
          <Typography variant="caption" color="error.main">
            {t('int.hours.atLeastOne')}
          </Typography>
        ) : null}
      </Stack>
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}
    </Stack>
  );
};

const EnabledSwitch = ({ integration, onSaved }: CardProps) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (next: boolean): void => {
    setSaving(true);
    setError(null);
    updateIntegrationEnabled(integration.name, next)
      .then((saved) => onSaved(saved, t(next ? 'int.savedOn' : 'int.savedOff', { name: integration.label })))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setSaving(false));
  };

  return (
    <Tooltip title={error ?? t(integration.enabled ? 'int.turnOff' : 'int.turnOn')}>
      <Switch
        checked={integration.enabled}
        disabled={saving}
        onChange={(event) => toggle(event.target.checked)}
        inputProps={{
          'aria-label': t(integration.enabled ? 'int.switch.off' : 'int.switch.on', { name: integration.label }),
        }}
        color={error ? 'error' : 'primary'}
      />
    </Tooltip>
  );
};

const Line = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    spacing={2}
    sx={{ py: 1.25, borderTop: 1, borderColor: 'divider' }}
  >
    <Typography variant="label" color="text.secondary">{label}</Typography>
    {children}
  </Stack>
);

const IntegrationCard = ({ integration, onSaved, onRemove }: CardProps) => {
  const next = integration.nextAt ? nextSearchAt(integration.nextAt, new Date()) : null;
  const off = !integration.enabled;
  const kind = integration.schedule.kind;

  /** Elegir el modo no guarda nada: solo cambia el formulario hasta que se pulse Guardar. */
  const [mode, setMode] = useState(kind);
  useEffect(() => { setMode(kind); }, [kind]);
  const pending = mode !== kind;

  return (
    <BlankCard>
      <Box p={3}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={2.75}>
          <PlatformIcon label={integration.label} />
          <Typography variant="h6" sx={{ fontSize: 16, flex: 1, minWidth: 0, opacity: off ? 0.6 : 1 }} noWrap>
            {integration.label}
          </Typography>
          <EnabledSwitch integration={integration} onSaved={onSaved} />
        </Stack>

        <Line label={t('int.status')}>
          <AppStatusPilot tone={off ? 'neutral' : 'success'} label={off ? t('int.off') : t('int.active')} />
        </Line>

        <Line label={t('int.rhythm')}>
          <Typography variant="mono" sx={{ fontSize: '0.6875rem' }}>
            {integration.schedule.kind === 'every-minutes'
              ? t('int.everyInterval', { interval: intervalLabel(integration.schedule.minutes) })
              : t('int.slotsPerDay', { count: integration.schedule.hours.length })}
          </Typography>
        </Line>

        <Line label={t('int.lastPass')}>
          <Typography variant="mono" sx={{ fontSize: '0.6875rem' }}>
            {integration.lastRunAt ? formatDateTime(integration.lastRunAt) : '—'}
          </Typography>
        </Line>

        <Line label={t('int.nextPass')}>
          <Typography variant="mono" sx={{ fontSize: '0.6875rem' }}>
            {off || !next ? '—' : formatNextSearch(next)}
          </Typography>
        </Line>

        <Typography sx={{ fontSize: 12, lineHeight: 1.7, color: 'text.secondary', mt: 2, mb: 2.5 }}>
          {off
            ? t('int.off.explain')
            : integration.needsLogin ? t('int.login.help') : t('int.open.help')}
        </Typography>

        <Box sx={{ opacity: off ? 0.45 : 1, pointerEvents: off ? 'none' : 'auto' }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            onChange={(_, next: 'every-minutes' | 'configured-hours' | null) => { if (next) setMode(next); }}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="every-minutes" sx={{ textTransform: 'none', fontSize: 12 }}>
              {t('int.mode.interval')}
            </ToggleButton>
            <ToggleButton value="configured-hours" sx={{ textTransform: 'none', fontSize: 12 }}>
              {t('int.mode.hours')}
            </ToggleButton>
          </ToggleButtonGroup>

          {mode === 'every-minutes'
            ? <IntervalEditor integration={integration} onSaved={onSaved} pending={pending} onCancel={() => setMode(kind)} />
            : <HoursEditor integration={integration} onSaved={onSaved} pending={pending} onCancel={() => setMode(kind)} />}
        </Box>

        {onRemove ? (
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Tooltip title={t('int.remove')}>
              <IconButton
                size="small"
                onClick={onRemove}
                aria-label={t('int.remove')}
                sx={{ opacity: 0.4, '&:hover': { opacity: 1, color: 'error.main' } }}
              >
                <IconTrash size={16} stroke={1.6} />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : null}
      </Box>
    </BlankCard>
  );
};

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mine, setMine] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<string[]>([]);
  const [asking, setAsking] = useState<Integration | null>(null);

  const load = useCallback(() => {
    listIntegrations()
      .then((next) => { setIntegrations(next); setError(null); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
    listSources()
      .then((own) => setMine(new Set(own.map((entry) => String(entry.name)))))
      .catch(() => undefined);
    listHiddenSources().then(setHidden).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  /** El aviso de guardado va arriba de la página, donde salen los demás: nada de toast. */
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const confirmRemove = (): void => {
    const target = asking;
    if (!target) return;
    setAsking(null);
    deleteSource(target.name)
      .then(() => { setNotice(t('int.remove.done', { name: target.label })); load(); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  };

  const restore = (): void => {
    showHiddenSources()
      .then(() => { setNotice(t('int.hidden.restored')); load(); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  };

  const replace = (saved: Integration, message?: string): void => {
    setIntegrations((prev) => prev?.map((item) => (item.name === saved.name ? saved : item)) ?? null);
    if (message) setNotice(message);
  };

  return (
    <PageContainer
      title={t('int.title')}
      subtitle={t('int.subtitle')}
      action={(
        <Stack direction="row" spacing={2} alignItems="center">
          {integrations ? (
            <Typography variant="label" color="text.secondary">
              {t('int.activeCount', { count: integrations.filter((item) => item.enabled).length })}
            </Typography>
          ) : null}
          <Button variant="contained" size="small" component={Link} to="/integraciones/nueva">
            {t('int.addSource')}
          </Button>
        </Stack>
      )}
    >
      {error ? <Box mb={2.25}><AppAlert severity="error">{error}</AppAlert></Box> : null}
      {notice ? (
        <Box mb={2.25}>
          <AppAlert severity="success" onClose={() => setNotice(null)}>{notice}</AppAlert>
        </Box>
      ) : null}
      {!integrations && !error ? (
        <Box sx={{ minHeight: 'max(240px, calc(100vh - 320px))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
      ) : null}
      {integrations?.length === 0 ? <AppAlert severity="info">{t('int.none')}</AppAlert> : null}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
          gap: 2.25,
          alignItems: 'start',
        }}
      >
        {integrations?.map((integration) => (
          <IntegrationCard
            key={integration.name}
            integration={integration}
            onSaved={replace}
            onRemove={() => setAsking(integration)}
          />
        ))}
      </Box>
      {hidden.length ? (
        <Stack direction="row" spacing={1.5} alignItems="center" mt={2.5}>
          <Typography variant="caption" color="text.secondary">
            {t('int.hidden.count', { count: hidden.length })}
          </Typography>
          <Button size="small" variant="text" onClick={restore}>{t('int.hidden.restore')}</Button>
        </Stack>
      ) : null}

      <AppDialog
        open={asking !== null}
        title={t('int.remove.title', { name: asking?.label ?? '' })}
        onClose={() => setAsking(null)}
        confirmLabel={t('int.remove')}
        onConfirm={confirmRemove}
      >
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {asking && mine.has(asking.name) ? t('int.remove.mine') : t('int.remove.catalogue')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('int.remove.keeps')}
        </Typography>
      </AppDialog>

    </PageContainer>
  );
};

export default IntegrationsPage;
