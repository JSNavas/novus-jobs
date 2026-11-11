import { useEffect, useRef, useState } from 'react';
import {
  Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, MenuItem, Stack,
  Switch, TextField, Typography,
} from '@mui/material';
import {
  listIntegrations, readCv, updateIntegrationEnabled,
  type CvReading, type EnglishLevel, type Integration, type OnboardingState,
} from '../../api/client';
import { AppAlert, AppChip } from '../../components/ui';
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
const ENGLISH_LABELS: Record<EnglishLevel, string> = {
  none: 'Ninguno',
  a1: 'A1 — algunas palabras',
  a2: 'A2 — básico, leo documentación',
  b1: 'B1 — intermedio, me defiendo por escrito',
  b2: 'B2 — intermedio alto, reuniones con esfuerzo',
  c1: 'C1 — avanzado, trabajo en inglés sin problema',
  c2: 'C2 — casi nativo',
  native: 'Nativo o bilingüe',
};

/* ── Paso 1: el CV ───────────────────────────────────────────────────────── */

interface CvPanelProps extends PanelProps {
  onRead: (cv: CvReading) => void;
}

export const CvStep = ({ state, onRead }: CvPanelProps) => {
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
      <Typography variant="body2" color="textSecondary">
        El CV se lee <strong>en esta máquina</strong> y se guarda junto a tus datos, fuera del
        proyecto. No se sube a ningún servidor ni se manda a nadie: es la razón por la que esto
        existe. Acepta {state.acceptedFiles.join(', ')}.
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
          {reading ? 'Leyendo…' : 'Elegir mi CV'}
        </Button>
        {reading ? <CircularProgress size={18} sx={{ ml: 2, verticalAlign: 'middle' }} /> : null}
      </Box>

      {state.canEnhance ? (
        <FormControlLabel
          control={<Switch checked={enhance} onChange={(event) => setEnhance(event.target.checked)} />}
          label={
            <Typography variant="body2">
              Leerlo también con el modelo (Gemini). Encuentra lo que no está escrito con sus
              palabras exactas, pero <strong>manda el texto de tu CV a Google</strong>. Sin esto,
              el CV no sale de aquí.
            </Typography>
          }
        />
      ) : (
        <Typography variant="caption" color="textSecondary">
          La lectura con modelo no está disponible: hace falta una GEMINI_API_KEY en el `.env` del
          servidor. Con las reglas locales basta para empezar.
        </Typography>
      )}

      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      {result ? (
        result.foundInCv ? (
          <AppAlert severity="info">
            Leí {result.stack.length} tecnologías
            {result.english ? `, inglés ${result.english.toUpperCase()}` : ''}
            {result.country ? `, ${result.city ?? result.country}` : ''}
            {result.years ? ` y ${result.years} años de experiencia` : ''}
            {result.enhanced ? ' (con el modelo)' : ''}. Revísalo en los pasos siguientes: lo que
            no reconocí lo rellenas tú.
          </AppAlert>
        ) : (
          <AppAlert severity="info">
            No reconocí nada en el fichero. Si es un PDF escaneado no hay texto que leer: sigue al
            paso siguiente y escríbelo a mano, que es igual de válido.
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
      <Typography variant="subtitle2" mb={0.5}>Todo lo que sabes</Typography>
      <Typography variant="caption" color="textSecondary" display="block" mb={1.5}>
        Enriquece el «Coincide con» de cada oferta. No abre la puerta por sí solo.
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
          <TextField {...params} placeholder="TypeScript, PostgreSQL, Docker…" size="small" />
        )}
      />
    </Box>

    <Box>
      <Typography variant="subtitle2" mb={0.5}>Tu núcleo</Typography>
      <Typography variant="caption" color="textSecondary" display="block" mb={1.5}>
        Las que definen tu oficio. Al menos una tiene que aparecer en la oferta para que te llegue:
        es el corte que evita que una vacante de Java te llegue por mencionar Docker. Elígelas de
        tu stack.
      </Typography>
      <Autocomplete
        multiple
        options={draft.stack}
        value={draft.core}
        onChange={(_event, value) => onChange({ ...draft, core: value })}
        renderInput={(params) => (
          <TextField {...params} placeholder="Las tres o cuatro que te definen" size="small" />
        )}
      />
    </Box>

    <Box>
      <Typography variant="subtitle2" mb={0.5}>Lo que no quieres que te ofrezcan</Typography>
      <Typography variant="caption" color="textSecondary" display="block" mb={1.5}>
        Si una oferta <strong>exige</strong> algo de aquí, se descarta. Marcado por ecosistemas
        enteros, que es como funciona en la práctica: quien no toca la JVM no quiere Spring ni
        Kotlin ni Hibernate. Revisa esto con calma —marcar algo que sí sabes tira ofertas buenas
        sin que te enteres— y déjalo vacío si no lo tienes claro.
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
      label="Tu nivel"
      value={draft.english.level}
      onChange={(event) => onChange({
        ...draft,
        english: { ...draft.english, level: event.target.value as EnglishLevel },
      })}
      sx={{ maxWidth: 420 }}
    >
      {state.catalogue.englishLevels.map((level) => (
        <MenuItem key={level} value={level}>{ENGLISH_LABELS[level]}</MenuItem>
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
        <Typography variant="body2">
          Descartar las ofertas que exijan <strong>más</strong> nivel del que tengo
        </Typography>
      }
    />
    <Typography variant="caption" color="textSecondary">
      Lo que descarta no es que pidan inglés: es que pidan más del que tienes. Un «inglés A2
      excluyente» con B1 te llega igual, porque lo cumples. Apagado, el idioma no esconde nada —útil
      si quieres ver cuánto te cierra y decidir si estudiarlo.
    </Typography>
  </Stack>
);

/* ── Paso 4: dónde ───────────────────────────────────────────────────────── */

const MODALITIES: { key: keyof Draft['modality']; label: string; hint: string }[] = [
  { key: 'remoteGlobal', label: 'Remoto global', hint: 'Sin restricción de residencia, o para toda tu región.' },
  { key: 'remoteHomeCountry', label: 'Remoto en tu país', hint: 'Remoto, pero solo para quien vive donde tú.' },
  { key: 'hybrid', label: 'Híbrido', hint: 'Oficina algunos días. Solo tiene sentido si la oficina te pilla cerca.' },
  { key: 'onsite', label: 'Presencial', hint: 'Oficina todos los días.' },
];

export const PlaceStep = ({ state, draft, onChange }: PanelProps) => (
  <Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField
        select
        size="small"
        label="País donde vives"
        value={draft.geo.country}
        onChange={(event) => onChange({ ...draft, geo: { ...draft.geo, country: event.target.value } })}
        sx={{ minWidth: 240 }}
      >
        <MenuItem value="">No está el mío</MenuItem>
        {state.catalogue.countries.map((country) => (
          <MenuItem key={country.code} value={country.code}>{country.label}</MenuItem>
        ))}
      </TextField>
      <TextField
        size="small"
        label="Tu ciudad (opcional)"
        value={draft.geo.city ?? ''}
        onChange={(event) => onChange({
          ...draft,
          geo: { ...draft.geo, city: event.target.value.trim() ? event.target.value : null },
        })}
        sx={{ minWidth: 240 }}
      />
    </Stack>
    {!draft.geo.country ? (
      <AppAlert severity="info">
        Sin país no se aplica ninguna regla de ubicación: te llegarán también las ofertas
        restringidas a otros países. Es a propósito —sin saber desde dónde buscas, descartarlas
        sería tirarlas por una suposición.
      </AppAlert>
    ) : null}

    <Box>
      <Typography variant="subtitle2" mb={1.5}>Qué modalidades aceptas</Typography>
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
                {modality.label}
                <Typography component="span" variant="caption" color="textSecondary"> — {modality.hint}</Typography>
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

  const toggle = (integration: Integration, enabled: boolean): void => {
    updateIntegrationEnabled(integration.name, enabled)
      .then((saved) => setIntegrations((prev) => prev?.map((i) => (i.name === saved.name ? saved : i)) ?? null))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="textSecondary">
        De dónde se leen las ofertas. Puedes cambiarlo cuando quieras en Integraciones, junto con el
        ritmo de cada una.
      </Typography>
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}
      {!integrations && !error ? <CircularProgress size={20} /> : null}
      {integrations?.map((integration) => (
        <Stack key={integration.name} direction="row" spacing={1.5} alignItems="center">
          <Switch
            checked={integration.enabled}
            onChange={(event) => toggle(integration, event.target.checked)}
          />
          <Typography variant="body2">{integration.label}</Typography>
          {integration.needsLogin ? <AppChip label="pide iniciar sesión" tone="neutral" /> : null}
        </Stack>
      ))}
      {integrations?.some((i) => i.enabled && i.needsLogin) ? (
        <AppAlert severity="info">
          Las que piden sesión necesitan que inicies sesión una vez, desde la terminal del servidor
          (<code>npm run login -- linkedin</code>). Hasta entonces esa plataforma no devolverá nada,
          y el dashboard te lo dirá con su motivo.
        </AppAlert>
      ) : null}
    </Stack>
  );
};

/* ── Paso 6: listo ───────────────────────────────────────────────────────── */

export const DoneStep = ({ draft }: PanelProps) => (
  <Stack spacing={2}>
    <Typography variant="body2" color="textSecondary">
      Con esto ya se puede buscar. Lo que falta tiene valores por defecto y se cambia sin reiniciar
      nada: el párrafo de motivación y la antigüedad máxima de las vacantes viven en Configuración,
      y el ritmo de cada plataforma en Integraciones.
    </Typography>
    <Box>
      <Typography variant="subtitle2" mb={1}>Lo que queda guardado</Typography>
      <Stack spacing={1}>
        <Typography variant="body2">
          <strong>Núcleo:</strong>{' '}
          {draft.core.length
            ? draft.core.map((tech) => <Chip key={tech} size="small" label={tech} sx={{ mr: 0.5 }} />)
            : '—'}
        </Typography>
        <Typography variant="body2">
          <strong>Stack:</strong> {draft.stack.length} tecnologías
        </Typography>
        <Typography variant="body2">
          <strong>Inglés:</strong> {ENGLISH_LABELS[draft.english.level]}
          {draft.english.filter ? ' · filtra lo que pide más' : ' · sin filtrar por idioma'}
        </Typography>
        <Typography variant="body2">
          <strong>Dónde:</strong> {draft.geo.country || 'sin país'}
          {draft.geo.city ? ` · ${draft.geo.city}` : ''}
          {' · '}
          {MODALITIES.filter((m) => draft.modality[m.key]).map((m) => m.label).join(', ') || 'ninguna modalidad marcada'}
        </Typography>
        <Typography variant="body2">
          <strong>Vetos:</strong>{' '}
          {draft.vetoEcosystems.length ? `${draft.vetoEcosystems.length} ecosistemas` : 'ninguno'}
        </Typography>
      </Stack>
    </Box>
    {!MODALITIES.some((m) => draft.modality[m.key]) ? (
      <AppAlert severity="error">
        No has dejado ninguna modalidad marcada: así no entraría ninguna oferta. Vuelve al paso
        «Dónde» y marca al menos una.
      </AppAlert>
    ) : null}
  </Stack>
);
