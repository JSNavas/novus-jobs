import { useEffect, useRef, useState } from 'react';
import {
  Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, MenuItem, Stack,
  Switch, TextField, Typography,
} from '@mui/material';
import {
  getSettings, listIntegrations, readCv, updateIntegrationEnabled, updateSettings,
  type CvReading, type EnglishLevel, type Integration, type OnboardingState, type Settings,
} from '../../api/client';

/** Los topes del formulario al que se pega el párrafo. Los valida el servidor. */
const MIN_MOTIVATION_CHARS = 50;
const MAX_MOTIVATION_CHARS = 1000;
import { AppAlert, AppChip } from '../../components/ui';
import { HoursEditor, IntervalEditor } from '../integrations/IntegrationsPage';
import { t, type TranslationKey } from '../../i18n';
import type { Draft } from './steps';

/**
 * LOS PANELES DEL ALTA. Uno por paso, y todos con la misma forma: reciben el
 * borrador y una función para cambiarlo. Ninguno guarda nada por su cuenta —de
 * eso se encarga la página al pasar de paso— salvo el de plataformas, que
 * escribe directo porque el interruptor de una integración ya es su propio
 * guardado.
 */
export interface PanelProps {
  state: OnboardingState;
  draft: Draft;
  onChange: (next: Draft) => void;
}

/** Cómo se lee cada nivel. La sigla sola no dice nada a quien no la conoce. */
const ENGLISH_KEYS: Record<EnglishLevel, TranslationKey> = {
  none: 'eng.none', a1: 'eng.a1', a2: 'eng.a2', b1: 'eng.b1',
  b2: 'eng.b2', c1: 'eng.c1', c2: 'eng.c2', native: 'eng.native',
};

const englishLabel = (level: EnglishLevel): string => t(ENGLISH_KEYS[level]);

/* ── Paso 1: el CV ───────────────────────────────────────────────────────── */

interface CvPanelProps extends PanelProps {
  onRead: (cv: CvReading) => void;
}

/**
 * EL IDIOMA, EN EL PRIMER PASO Y ANTES QUE NADA.
 *
 * Va aquí arriba y no en un paso propio porque quien abre esto por primera vez
 * y no lee español necesita cambiarlo ANTES de entender qué le están
 * preguntando. Un paso dedicado llegaría tarde: para verlo ya habría tenido
 * que leer el anterior.
 */
const LanguagePicker = ({ draft, onChange }: PanelProps) => (
  <TextField
    select
    size="small"
    label={t('wiz.language')}
    value={draft.language}
    onChange={(event) => onChange({ ...draft, language: event.target.value as Draft['language'] })}
    sx={{ maxWidth: 220 }}
  >
    <MenuItem value="es">Español</MenuItem>
    <MenuItem value="en">English</MenuItem>
  </TextField>
);

export const CvStep = ({ state, draft, onChange, onRead }: CvPanelProps) => {
  const input = useRef<HTMLInputElement>(null);
  const [enhance, setEnhance] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CvReading | null>(null);

  const pick = (file: File | undefined): void => {
    if (!file) return;
    setReading(true);
    setError(null);
    readCv(file, enhance)
      .then((cv) => { setResult(cv); onRead(cv); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setReading(false));
  };

  return (
    <Stack spacing={2.5}>
      <LanguagePicker state={state} draft={draft} onChange={onChange} />
      <Typography variant="body2" color="textSecondary">
        {t('cv.privacy', { formats: state.acceptedFiles.join(', ') })}
      </Typography>

      <Box>
        <input
          ref={input}
          type="file"
          accept={state.acceptedFiles.join(',')}
          style={{ display: 'none' }}
          onChange={(event) => pick(event.target.files?.[0])}
        />
        <Button variant="contained" disabled={reading} onClick={() => input.current?.click()}>
          {reading ? t('cv.reading') : t('cv.choose')}
        </Button>
        {reading ? <CircularProgress size={18} sx={{ ml: 2, verticalAlign: 'middle' }} /> : null}
      </Box>

      {state.canEnhance ? (
        <FormControlLabel
          control={<Switch checked={enhance} onChange={(event) => setEnhance(event.target.checked)} />}
          label={
            <Typography variant="body2">{t('cv.enhance')}</Typography>
          }
        />
      ) : (
        <Typography variant="caption" color="textSecondary">
          {t('cv.noKey')}
        </Typography>
      )}

      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      {result ? (
        result.foundInCv ? (
          <AppAlert severity="info">
            {t('cv.read', {
              count: result.stack.length,
              english: result.english ? t('cv.read.english', { level: result.english.toUpperCase() }) : '',
              place: result.country ? `, ${result.city ?? result.country}` : '',
              years: result.years ? t('cv.read.years', { years: result.years }) : '',
              model: result.enhanced ? t('cv.read.model') : '',
            })}
          </AppAlert>
        ) : (
          <AppAlert severity="info">
            {t('cv.nothing')}
          </AppAlert>
        )
      ) : null}
    </Stack>
  );
};

/* ── Paso 2: el stack ────────────────────────────────────────────────────── */

export const StackStep = ({ state, draft, onChange }: PanelProps) => (
  <Stack spacing={3}>
    <Box>
      <Typography variant="subtitle2" mb={0.5}>{t('stack.all')}</Typography>
      <Typography variant="caption" color="textSecondary" display="block" mb={1.5}>
        {t('stack.all.help')}
      </Typography>
      <Autocomplete
        multiple
        freeSolo
        options={[]}
        value={draft.stack}
        onChange={(_event, value) => onChange({
          ...draft,
          stack: value as string[],
          // Lo que sale del stack no puede quedarse en el núcleo: serían dos
          // listas diciendo cosas distintas de la misma tecnología.
          core: draft.core.filter((tech) => (value as string[]).includes(tech)),
        })}
        renderInput={(params) => (
          <TextField {...params} placeholder={t('stack.all.placeholder')} size="small" />
        )}
      />
    </Box>

    <Box>
      <Typography variant="subtitle2" mb={0.5}>{t('stack.core')}</Typography>
      <Typography variant="caption" color="textSecondary" display="block" mb={1.5}>
        {t('stack.core.help')}
      </Typography>
      <Autocomplete
        multiple
        options={draft.stack}
        value={draft.core}
        onChange={(_event, value) => onChange({ ...draft, core: value })}
        renderInput={(params) => (
          <TextField {...params} placeholder={t('stack.core.placeholder')} size="small" />
        )}
      />
    </Box>

    <Box>
      <Typography variant="subtitle2" mb={0.5}>{t('stack.vetoes')}</Typography>
      <Typography variant="caption" color="textSecondary" display="block" mb={1.5}>
        {t('stack.vetoes.help')}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 0.5 }}>
        {state.catalogue.ecosystems.map((eco) => {
          const on = draft.vetoEcosystems.includes(eco.id);
          return (
            <FormControlLabel
              key={eco.id}
              control={
                <Checkbox
                  size="small"
                  checked={on}
                  onChange={() => onChange({
                    ...draft,
                    vetoEcosystems: on
                      ? draft.vetoEcosystems.filter((id) => id !== eco.id)
                      : [...draft.vetoEcosystems, eco.id],
                  })}
                />
              }
              label={<Typography variant="body2">{eco.label}</Typography>}
            />
          );
        })}
      </Box>
    </Box>
  </Stack>
);

/* ── Paso 3: el inglés ───────────────────────────────────────────────────── */

export const EnglishStep = ({ state, draft, onChange }: PanelProps) => (
  <Stack spacing={2.5}>
    <TextField
      select
      size="small"
      label={t('eng.yourLevel')}
      value={draft.english.level}
      onChange={(event) => onChange({
        ...draft,
        english: { ...draft.english, level: event.target.value as EnglishLevel },
      })}
      sx={{ maxWidth: 420 }}
    >
      {state.catalogue.englishLevels.map((level) => (
        <MenuItem key={level} value={level}>{englishLabel(level)}</MenuItem>
      ))}
    </TextField>

    <FormControlLabel
      control={
        <Switch
          checked={draft.english.filter}
          onChange={(event) => onChange({
            ...draft,
            english: { ...draft.english, filter: event.target.checked },
          })}
        />
      }
      label={
        <Typography variant="body2">{t('eng.filter')}</Typography>
      }
    />
    <Typography variant="caption" color="textSecondary">
      {t('eng.filter.help')}
    </Typography>
  </Stack>
);

/* ── Paso 4: dónde ───────────────────────────────────────────────────────── */

/**
 * Las zonas las enumera el propio navegador: mantener una lista a mano sería
 * mantener una copia del tz database, y se queda vieja sola. Si el runtime es
 * viejo y no la trae, se cae a la suya, que es la que acierta casi siempre.
 */
function timeZones(): string[] {
  const supported = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  const own = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const all = supported ? supported('timeZone') : [own];
  return all.includes(own) ? all : [own, ...all];
}

const MODALITIES: { key: keyof Draft['modality']; label: TranslationKey; hint: TranslationKey }[] = [
  { key: 'remoteGlobal', label: 'mod.remoteGlobal', hint: 'mod.remoteGlobal.hint' },
  { key: 'remoteHomeCountry', label: 'mod.remoteHome', hint: 'mod.remoteHome.hint' },
  { key: 'hybrid', label: 'mod.hybrid', hint: 'mod.hybrid.hint' },
  { key: 'onsite', label: 'mod.onsite', hint: 'mod.onsite.hint' },
];

export const PlaceStep = ({ state, draft, onChange }: PanelProps) => (
  <Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField
        select
        size="small"
        label={t('geo.country')}
        value={draft.geo.country}
        onChange={(event) => onChange({ ...draft, geo: { ...draft.geo, country: event.target.value } })}
        sx={{ minWidth: 240 }}
      >
        <MenuItem value="">{t('geo.noCountry')}</MenuItem>
        {state.catalogue.countries.map((country) => (
          <MenuItem key={country.code} value={country.code}>{country.label}</MenuItem>
        ))}
      </TextField>
      <TextField
        size="small"
        label={t('geo.city')}
        value={draft.geo.city ?? ''}
        onChange={(event) => onChange({
          ...draft,
          geo: { ...draft.geo, city: event.target.value.trim() ? event.target.value : null },
        })}
        sx={{ minWidth: 240 }}
      />
    </Stack>
    <Box>
      <Autocomplete
        options={timeZones()}
        value={draft.geo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
        onChange={(_event, value) => onChange({ ...draft, geo: { ...draft.geo, timezone: value ?? '' } })}
        disableClearable
        renderInput={(params) => <TextField {...params} size="small" label={t('geo.timezone')} />}
        sx={{ maxWidth: 420 }}
      />
      <Typography variant="caption" color="textSecondary" display="block" mt={1}>
        {t('geo.timezone.help')}
      </Typography>
    </Box>

    {!draft.geo.country ? (
      <AppAlert severity="info">
        {t('geo.noCountry.warning')}
      </AppAlert>
    ) : null}

    <Box>
      <Typography variant="subtitle2" mb={1.5}>{t('mod.title')}</Typography>
      <Stack spacing={0.5}>
        {MODALITIES.map((modality) => (
          <FormControlLabel
            key={modality.key}
            control={
              <Checkbox
                size="small"
                checked={draft.modality[modality.key]}
                onChange={(event) => onChange({
                  ...draft,
                  modality: { ...draft.modality, [modality.key]: event.target.checked },
                })}
              />
            }
            label={
              <Typography variant="body2">
                {t(modality.label)}
                <Typography component="span" variant="caption" color="textSecondary"> — {t(modality.hint)}</Typography>
              </Typography>
            }
          />
        ))}
      </Stack>
    </Box>
  </Stack>
);

/* ── Paso 5: las plataformas ─────────────────────────────────────────────── */

/**
 * Este paso escribe directo en el servidor: el interruptor de una integración
 * ES su guardado, y duplicarlo en el borrador solo daría dos sitios donde el
 * mismo dato puede discrepar.
 */
export const SourcesStep = () => {
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listIntegrations()
      .then(setIntegrations)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  const replace = (saved: Integration): void => {
    setIntegrations((prev) => prev?.map((i) => (i.name === saved.name ? saved : i)) ?? null);
  };

  const toggle = (integration: Integration, enabled: boolean): void => {
    updateIntegrationEnabled(integration.name, enabled)
      .then(replace)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  };

  return (
    <Stack spacing={2}>
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}
      {!integrations && !error ? <CircularProgress size={20} /> : null}
      {integrations?.map((integration) => (
        <Box key={integration.name}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Switch
              checked={integration.enabled}
              onChange={(event) => toggle(integration, event.target.checked)}
            />
            <Typography variant="body2">{integration.label}</Typography>
            {integration.needsLogin ? <AppChip label={t('src.needsLogin')} tone="neutral" /> : null}
          </Stack>
          {/* El ritmo de la que está encendida, con el mismo editor que la
              página de Integraciones: cuándo se lee es parte de darla de alta,
              no algo que se descubra después. */}
          {integration.enabled ? (
            <Box sx={{ pl: 6, pt: 1 }}>
              {integration.schedule.kind === 'every-minutes'
                ? <IntervalEditor integration={integration} onSaved={replace} />
                : <HoursEditor integration={integration} onSaved={replace} />}
            </Box>
          ) : null}
        </Box>
      ))}
      {integrations?.some((i) => i.enabled && i.needsLogin) ? (
        <AppAlert severity="info">
          {t('src.loginHint')}
        </AppAlert>
      ) : null}
    </Stack>
  );
};

/* ── Paso 6: la candidatura y los límites ────────────────────────────────── */

const MONTH_OPTIONS = [1, 2, 3, 6, 12, 24];

/**
 * LO QUE SE PUEDE DEJAR COMO ESTÁ, pero que conviene mirar una vez.
 *
 * El párrafo de motivación viene con un ejemplo y la idea es que lo reescriba:
 * es lo único de todo el alta que va a leer una persona al otro lado, y un
 * párrafo por defecto se reconoce a la legua.
 *
 * Escribe directo en los ajustes del servidor, no en el borrador del perfil:
 * estos tres no son del perfil —son de la búsqueda y de la pantalla— y ya
 * tienen su sitio en Configuración. Duplicarlos en el borrador sería dos
 * fuentes para el mismo dato.
 */
export const LimitsStep = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [template, setTemplate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then((loaded) => { setSettings(loaded); setTemplate(loaded.motivationTemplate); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  const save = (changes: Parameters<typeof updateSettings>[0]): void => {
    setSaving(true);
    setError(null);
    updateSettings(changes)
      .then((next) => { setSettings(next); if (changes.motivationTemplate !== undefined) setTemplate(next.motivationTemplate); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setSaving(false));
  };

  const length = template.trim().length;
  const tooShort = length > 0 && length < MIN_MOTIVATION_CHARS;
  const tooLong = length > MAX_MOTIVATION_CHARS;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" mb={0.5}>{t('limits.motivation')}</Typography>
        <Typography variant="caption" color="textSecondary" display="block" mb={1.5}>
          {t('limits.motivation.help')}
        </Typography>
        <TextField
          multiline
          minRows={8}
          fullWidth
          value={template}
          disabled={settings === null}
          onChange={(event) => setTemplate(event.target.value)}
          onBlur={() => {
            if (settings && template !== settings.motivationTemplate && !tooShort && !tooLong) {
              save({ motivationTemplate: template });
            }
          }}
          error={tooShort || tooLong}
          helperText={
            tooLong
              ? t('set.chars.tooLong', { length, max: MAX_MOTIVATION_CHARS })
              : tooShort
                ? t('set.chars.tooShort', { length, min: MIN_MOTIVATION_CHARS })
                : t('set.chars.ok', { length })
          }
        />
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Box>
          <Typography variant="subtitle2" mb={0.5}>{t('limits.maxAge')}</Typography>
          <Typography variant="caption" color="textSecondary" display="block" mb={1.5}>
            {t('limits.maxAge.help')}
          </Typography>
          <TextField
            select
            size="small"
            value={settings?.maxAgeMonths ?? 3}
            disabled={settings === null || saving}
            onChange={(event) => save({ maxAgeMonths: Number(event.target.value) })}
            sx={{ minWidth: 180 }}
          >
            {MONTH_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>{t('limits.months', { count: option })}</MenuItem>
            ))}
          </TextField>
        </Box>
        <Box>
          <Typography variant="subtitle2" mb={0.5}>{t('limits.focus')}</Typography>
          <Typography variant="caption" color="textSecondary" display="block" mb={1.5}>
            {t('limits.focus.help')}
          </Typography>
          <TextField
            select
            size="small"
            value={settings?.focusWindowMonths ?? 6}
            disabled={settings === null || saving}
            onChange={(event) => save({ focusWindowMonths: Number(event.target.value) })}
            sx={{ minWidth: 180 }}
          >
            {MONTH_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>{t('limits.months', { count: option })}</MenuItem>
            ))}
          </TextField>
        </Box>
      </Stack>

      {error ? <AppAlert severity="error">{error}</AppAlert> : null}
    </Stack>
  );
};

/* ── Paso 7: listo ───────────────────────────────────────────────────────── */

export const DoneStep = ({ draft }: PanelProps) => (
  <Stack spacing={2}>
    <Typography variant="body2" color="textSecondary">
      {t('done.help')}
    </Typography>
    <Box>
      <Typography variant="subtitle2" mb={1}>{t('done.summary')}</Typography>
      <Stack spacing={1}>
        <Typography variant="body2">
          <strong>{t('done.core')}</strong>{' '}
          {draft.core.length
            ? draft.core.map((tech) => <Chip key={tech} size="small" label={tech} sx={{ mr: 0.5 }} />)
            : '—'}
        </Typography>
        <Typography variant="body2">
          <strong>{t('done.stack')}</strong> {t('done.stackCount', { count: draft.stack.length })}
        </Typography>
        <Typography variant="body2">
          <strong>{t('done.english')}</strong> {englishLabel(draft.english.level)}
          {t(draft.english.filter ? 'done.english.filters' : 'done.english.noFilter')}
        </Typography>
        <Typography variant="body2">
          <strong>{t('done.where')}</strong> {draft.geo.country || t('done.noCountry')}
          {draft.geo.city ? ` · ${draft.geo.city}` : ''}
          {' · '}
          {MODALITIES.filter((m) => draft.modality[m.key]).map((m) => t(m.label)).join(', ') || t('done.noModality')}
        </Typography>
        <Typography variant="body2">
          <strong>{t('done.vetoes')}</strong>{' '}
          {draft.vetoEcosystems.length ? t('done.vetoCount', { count: draft.vetoEcosystems.length }) : t('done.none')}
        </Typography>
      </Stack>
    </Box>
    {!MODALITIES.some((m) => draft.modality[m.key]) ? (
      <AppAlert severity="error">
        {t('done.noModality.error')}
      </AppAlert>
    ) : null}
  </Stack>
);
