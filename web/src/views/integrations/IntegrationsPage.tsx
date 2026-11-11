import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import {
  Box, Button, CircularProgress, Stack, TextField, ToggleButton, Typography,
} from '@mui/material';
import {
  listIntegrations, updateIntegrationSchedule, type Integration,
} from '../../api/client';
import { AppAlert, AppChip, BlankCard, PageContainer } from '../../components/ui';
import { formatDateTime } from '../../format';
import { formatNextSearch, nextSearchAt } from '../jobs/scheduleText';
import {
  ALL_HOURS, hourLabel, INTERVAL_PRESETS, intervalError, intervalLabel,
} from './scheduleEditor';

/**
 * INTEGRACIONES — una tarjeta por plataforma, y ninguna escrita a mano.
 *
 * La lista sale de `/api/integrations`, que a su vez es `JOB_SOURCES`: el día
 * que entre InfoJobs aparecerá aquí sola, con su editor, sin tocar React. Lo
 * único que decide qué editor se pinta es la FORMA del horario que declara su
 * política: LinkedIn va por franjas porque es una cuenta vigilada y leer a
 * deshora es lo que quema una cuenta; Get on Board va por intervalo porque es
 * una API pública y ahí lo único en juego es no ser un mal vecino.
 *
 * Por eso la forma no se elige desde aquí: se elige el número.
 */

const POLL_INTERVAL_MS = 30_000;

interface CardProps {
  integration: Integration;
  onSaved: (next: Integration) => void;
}

const IntervalEditor = ({ integration, onSaved }: CardProps) => {
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
        Cada cuánto se lee. Es una API pública, así que no hay cuenta que cuidar: el único
        motivo para no bajarlo a cero es no castigar un servidor ajeno.
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
          label="Minutos"
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
          Guardar
        </Button>
      </Stack>
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}
    </Stack>
  );
};

const HoursEditor = ({ integration, onSaved }: CardProps) => {
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
        A qué horas se lee ({integration.timezone}). Son franjas y no un intervalo a propósito:
        una cuenta vigilada se quema por el patrón, no por el número de lecturas, y tres visitas
        a horas de persona es lo que lleva meses sin dar problemas.
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
          Guardar
        </Button>
        {hours.length === 0 ? (
          <Typography variant="caption" color="error.main">
            Deja al menos una hora: sin ninguna, esta integración no buscaría nunca.
          </Typography>
        ) : null}
      </Stack>
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}
    </Stack>
  );
};

const IntegrationCard = ({ integration, onSaved }: CardProps) => {
  const next = integration.nextAt ? nextSearchAt(integration.nextAt, new Date()) : null;
  return (
    <BlankCard>
      <Box p={3}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
          <Typography variant="h6">{integration.label}</Typography>
          <AppChip
            label={integration.schedule.kind === 'every-minutes'
              ? `cada ${intervalLabel(integration.schedule.minutes)}`
              : `${integration.schedule.hours.length} franja(s) al día`}
            tone="neutral"
          />
          {integration.needsLogin ? <AppChip label="con sesión" tone="neutral" /> : null}
        </Stack>
        <Typography variant="caption" color="textSecondary" display="block" mb={2.5}>
          {next ? formatNextSearch(next) : 'Sin próxima búsqueda programada'}
          {integration.lastRunAt ? ` · última: ${formatDateTime(integration.lastRunAt)}` : ' · todavía no ha leído'}
        </Typography>
        {integration.schedule.kind === 'every-minutes'
          ? <IntervalEditor integration={integration} onSaved={onSaved} />
          : <HoursEditor integration={integration} onSaved={onSaved} />}
      </Box>
    </BlankCard>
  );
};

const IntegrationsPage = () => {
  // `/integraciones/linkedin` enseña solo esa; `/integraciones`, todas. La
  // misma página sirve para las dos cosas porque la tarjeta es la unidad.
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
    // La cuenta atrás de cada integración envejece sola: se vuelve a preguntar.
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const replace = (saved: Integration): void => {
    setIntegrations((prev) => prev?.map((item) => (item.name === saved.name ? saved : item)) ?? null);
  };

  const shown = name ? integrations?.filter((item) => item.name === name) ?? null : integrations;
  const title = (name && shown?.length === 1 ? shown[0]!.label : 'Integraciones');

  return (
    <PageContainer
      title={title}
      subtitle="De dónde salen las ofertas y cada cuánto se mira cada sitio"
    >
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}
      {!integrations && !error ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : null}
      {shown?.length === 0 ? (
        <AppAlert severity="info">
          {name
            ? `No hay ninguna integración llamada "${name}".`
            : 'No hay ninguna integración activa. Se encienden con JOB_SOURCES en el .env del servidor.'}
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
