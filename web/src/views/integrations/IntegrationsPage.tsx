import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import {
  Box, Button, CircularProgress, Stack, Switch, TextField, ToggleButton, Tooltip, Typography,
} from '@mui/material';
import {
  listIntegrations, updateIntegrationEnabled, updateIntegrationSchedule, type Integration,
} from '../../api/client';
import { AppAlert, AppChip, BlankCard, PageContainer } from '../../components/ui';
import { t } from '../../i18n';
import { formatDateTime } from '../../format';
import { formatNextSearch, nextSearchAt } from '../jobs/scheduleText';
import {
  ALL_HOURS, hourLabel, INTERVAL_PRESETS, intervalError, intervalLabel,
} from './scheduleEditor';

const POLL_INTERVAL_MS = 30_000;

export interface CardProps {
  integration: Integration;
  onSaved: (next: Integration) => void;
}

export const IntervalEditor = ({ integration, onSaved }: CardProps) => {
  const current = integration.schedule.kind === 'every-minutes' ? integration.schedule.minutes : 60;
  const [minutes, setMinutes] = useState(String(current));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMinutes(String(current)); }, [current]);

  const save = (value: number): void => {
    setSaving(true);
    setError(null);
    updateIntegrationSchedule(integration.name, { minutes: value })
      .then(onSaved)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setSaving(false));
  };

  const invalid = intervalError(minutes);

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="textSecondary">
        {t('int.interval.help')}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {INTERVAL_PRESETS.map((preset) => (
          <ToggleButton
            key={preset}
            value={preset}
            size="small"
            selected={preset === current}
            disabled={saving}
            onChange={() => { setMinutes(String(preset)); save(preset); }}
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
          sx={{ width: 160 }}
        />
        <Button
          variant="contained"
          disabled={saving || Boolean(invalid) || Number(minutes) === current}
          onClick={() => save(Number(minutes))}
          sx={{ mt: 0.5 }}
        >
          {t('int.save')}
        </Button>
      </Stack>
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}
    </Stack>
  );
};

export const HoursEditor = ({ integration, onSaved }: CardProps) => {
  const current = integration.schedule.kind === 'configured-hours' ? integration.schedule.hours : [];
  const [hours, setHours] = useState<number[]>(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setHours(current); }, [current.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (): void => {
    setSaving(true);
    setError(null);
    updateIntegrationSchedule(integration.name, { hours })
      .then(onSaved)
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
        <Button variant="contained" disabled={saving || !changed || hours.length === 0} onClick={save}>
          {t('int.save')}
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
      .then(onSaved)
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

const IntegrationCard = ({ integration, onSaved }: CardProps) => {
  const next = integration.nextAt ? nextSearchAt(integration.nextAt, new Date()) : null;
  const off = !integration.enabled;
  return (
    <BlankCard>
      <Box p={3}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
          <Typography variant="h6" sx={{ opacity: off ? 0.6 : 1 }}>{integration.label}</Typography>
          <AppChip
            label={integration.schedule.kind === 'every-minutes'
              ? t('int.everyInterval', { interval: intervalLabel(integration.schedule.minutes) })
              : t('int.slotsPerDay', { count: integration.schedule.hours.length })}
            tone="neutral"
          />
          {integration.needsLogin ? <AppChip label={t('int.needsLogin')} tone="neutral" /> : null}
          {off ? <AppChip label={t('int.off')} tone="neutral" /> : null}
          <Box flexGrow={1} />
          <EnabledSwitch integration={integration} onSaved={onSaved} />
        </Stack>
        <Typography variant="caption" color="textSecondary" display="block" mb={2.5}>
          {off
            ? t('int.off.explain')
            : `${next ? formatNextSearch(next) : t('int.noNext')}${
              integration.lastRunAt
                ? t('int.lastRun', { date: formatDateTime(integration.lastRunAt) })
                : t('int.neverRun')}`}
        </Typography>
        <Box sx={{ opacity: off ? 0.45 : 1, pointerEvents: off ? 'none' : 'auto' }}>
          {integration.schedule.kind === 'every-minutes'
            ? <IntervalEditor integration={integration} onSaved={onSaved} />
            : <HoursEditor integration={integration} onSaved={onSaved} />}
        </Box>
      </Box>
    </BlankCard>
  );
};

const IntegrationsPage = () => {
  const { name } = useParams<{ name?: string }>();
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listIntegrations()
      .then((next) => { setIntegrations(next); setError(null); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const replace = (saved: Integration): void => {
    setIntegrations((prev) => prev?.map((item) => (item.name === saved.name ? saved : item)) ?? null);
  };

  const shown = name ? integrations?.filter((item) => item.name === name) ?? null : integrations;
  const title = (name && shown?.length === 1 ? shown[0]!.label : t('int.title'));

  return (
    <PageContainer
      title={title}
      subtitle={t('int.subtitle')}
    >
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}
      {!integrations && !error ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : null}
      {shown?.length === 0 ? (
        <AppAlert severity="info">
          {name
            ? t('int.notFound', { name })
            : t('int.none')}
        </AppAlert>
      ) : null}
      <Stack spacing={2}>
        {shown?.map((integration) => (
          <IntegrationCard key={integration.name} integration={integration} onSaved={replace} />
        ))}
      </Stack>
    </PageContainer>
  );
};

export default IntegrationsPage;
