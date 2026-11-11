import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Box, Button, CircularProgress, Container, Stack, Step, StepLabel, Stepper, Typography,
} from '@mui/material';
import {
  completeOnboarding, getOnboarding, saveOnboardingStep,
  type CvReading, type OnboardingState,
} from '../../api/client';
import { AppAlert, BlankCard } from '../../components/ui';
import { CvStep, DoneStep, EnglishStep, PlaceStep, SourcesStep, StackStep } from './StepPanels';
import { applyReading, blockingError, draftFrom, STEPS, type Draft } from './steps';

/**
 * LA BIENVENIDA. Lo primero que ve alguien que acaba de clonar esto.
 *
 * Vive fuera del marco de la aplicación —sin barra lateral ni cabecera— a
 * propósito: no hay nada que navegar todavía, y un menú lleno de pantallas
 * vacías invita a perderse antes de tener un perfil.
 *
 * Cada paso se GUARDA al pasar al siguiente, no al final. Un alta que solo
 * guarda al terminar castiga al que se interrumpe, y aquí interrumpirse es lo
 * normal: hay que buscar el CV, pensarse los vetos, decidir el inglés. Al
 * volver, el formulario está donde lo dejó.
 */
const WelcomePage = () => {
  const navigate = useNavigate();
  // La misma pantalla sirve para darse de alta y para corregir el perfil más
  // tarde. Sin esto, cambiar el stack tras el alta no tendría dónde hacerse:
  // el formulario está aquí, y duplicarlo en Configuración sería mantener dos.
  const [params] = useSearchParams();
  const editing = params.get('editar') === '1';
  const [state, setState] = useState<OnboardingState | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOnboarding()
      .then((next) => {
        setState(next);
        setDraft(draftFrom(next));
        // Ya dado de alta: aquí no hay nada que hacer. Se puede volver a esta
        // pantalla a propósito desde Configuración, pero no por accidente.
        if (next.completed && !editing) navigate('/', { replace: true });
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [navigate, editing]);

  /** Lo que se manda al servidor en cada paso. Solo lo que ese paso decide. */
  const changesOf = useCallback((index: number, current: Draft) => {
    switch (index) {
      case 1: return { stack: current.stack, core: current.core, vetoEcosystems: current.vetoEcosystems };
      case 2: return { english: current.english };
      case 3: return { geo: current.geo, modality: current.modality };
      // El CV y las plataformas no tienen nada propio que guardar: el primero
      // solo rellena el borrador y el segundo escribe directo.
      default: return null;
    }
  }, []);

  const go = (next: number): void => {
    if (!draft) return;
    const blocking = blockingError(step, draft);
    if (blocking && next > step) {
      setError(blocking);
      return;
    }
    setError(null);
    const changes = changesOf(step, draft);
    if (!changes) {
      setStep(next);
      return;
    }
    setSaving(true);
    saveOnboardingStep(changes)
      .then(() => setStep(next))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setSaving(false));
  };

  const finish = (): void => {
    if (!draft || !state) return;
    setSaving(true);
    setError(null);
    // Se vuelven a mandar los pasos con valores por defecto: quien llegó al
    // final saltándoselos tiene que acabar igual con un perfil coherente.
    saveOnboardingStep({
      stack: draft.stack, core: draft.core, vetoEcosystems: draft.vetoEcosystems,
      english: draft.english, geo: draft.geo, modality: draft.modality,
    })
      // Ya dado de alta, no se vuelve a marcar: la fecha del alta es cuándo
      // empezó a usarlo, no cuándo tocó el perfil por última vez.
      .then(() => (state.completed ? Promise.resolve() : completeOnboarding().then(() => undefined)))
      .then(() => navigate(editing ? '/configuracion' : '/', { replace: true }))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setSaving(false));
  };

  const onRead = (cv: CvReading): void => {
    setDraft((prev) => (prev ? applyReading(prev, cv) : prev));
  };

  if (error && !state) return <Container maxWidth="md" sx={{ py: 6 }}><AppAlert severity="error">{error}</AppAlert></Container>;
  if (!state || !draft) {
    return (
      <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
    );
  }

  const definition = STEPS[step]!;
  const panel = { state, draft, onChange: setDraft };
  const last = step === STEPS.length - 1;

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Typography variant="h4" mb={0.5}>
        {editing ? 'Tu perfil' : 'Bienvenido a Novus Jobs'}
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" mb={4}>
        {editing
          ? 'Lo que decide qué oferta te llega. Cada paso se guarda al pasar al siguiente y se aplica en la próxima búsqueda.'
          : 'Tu CV y tus postulaciones se quedan en tu máquina. Para empezar, cuéntale al filtro qué buscas: son cinco minutos y se puede cambiar todo después.'}
      </Typography>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        {STEPS.map((item) => (
          <Step key={item.label}><StepLabel>{item.label}</StepLabel></Step>
        ))}
      </Stepper>

      <BlankCard>
        <Box p={3}>
          <Typography variant="h6" mb={0.5}>{definition.label}</Typography>
          <Typography variant="body2" color="textSecondary" mb={3}>{definition.hint}</Typography>

          {step === 0 ? <CvStep {...panel} onRead={onRead} /> : null}
          {step === 1 ? <StackStep {...panel} /> : null}
          {step === 2 ? <EnglishStep {...panel} /> : null}
          {step === 3 ? <PlaceStep {...panel} /> : null}
          {step === 4 ? <SourcesStep /> : null}
          {step === 5 ? <DoneStep {...panel} /> : null}

          {error ? <Box mt={3}><AppAlert severity="error">{error}</AppAlert></Box> : null}

          <Stack direction="row" spacing={2} alignItems="center" mt={4}>
            <Button variant="text" disabled={step === 0 || saving} onClick={() => go(step - 1)}>
              Atrás
            </Button>
            <Box flexGrow={1} />
            {last ? (
              <Button variant="contained" disabled={saving} onClick={finish}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Empezar a buscar'}
              </Button>
            ) : (
              <Button variant="contained" disabled={saving} onClick={() => go(step + 1)}>
                {definition.optional ? 'Siguiente' : 'Guardar y seguir'}
              </Button>
            )}
          </Stack>
        </Box>
      </BlankCard>
    </Container>
  );
};

export default WelcomePage;
