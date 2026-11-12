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
import { setLanguage, t } from '../../i18n';
import { CvStep, DoneStep, EnglishStep, LimitsStep, PlaceStep, SourcesStep, StackStep } from './StepPanels';
import { applyReading, blockingError, draftFrom, STEPS, type Draft } from './steps';

const WelcomePage = () => {
  const navigate = useNavigate();
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
        setLanguage(next.profile.language);
        if (next.completed && !editing) navigate('/', { replace: true });
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [navigate, editing]);

  const changesOf = useCallback((index: number, current: Draft) => {
    switch (index) {
      case 0: return { language: current.language };
      case 1: return { stack: current.stack, core: current.core, vetoEcosystems: current.vetoEcosystems };
      case 2: return { english: current.english };
      case 3: return { geo: current.geo, modality: current.modality };
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
    saveOnboardingStep({
      language: draft.language,
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

  const changeDraft = (next: Draft): void => {
    if (draft && next.language !== draft.language) setLanguage(next.language);
    setDraft(next);
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
  const panel = { state, draft, onChange: changeDraft };
  const last = step === STEPS.length - 1;

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Typography variant="h4" mb={0.5}>
        {t(editing ? 'wiz.title.edit' : 'wiz.title.welcome')}
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" mb={4}>
        {editing
          ? t('wiz.subtitle.edit')
          : t('wiz.subtitle.welcome')}
      </Typography>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        {STEPS.map((item) => (
          <Step key={item.label}><StepLabel>{t(item.label)}</StepLabel></Step>
        ))}
      </Stepper>

      <BlankCard>
        <Box p={3}>
          <Typography variant="h6" mb={0.5}>{t(definition.label)}</Typography>
          <Typography variant="body2" color="textSecondary" mb={3}>{t(definition.hint)}</Typography>

          {step === 0 ? <CvStep {...panel} onRead={onRead} /> : null}
          {step === 1 ? <StackStep {...panel} /> : null}
          {step === 2 ? <EnglishStep {...panel} /> : null}
          {step === 3 ? <PlaceStep {...panel} /> : null}
          {step === 4 ? <SourcesStep /> : null}
          {step === 5 ? <LimitsStep /> : null}
          {step === 6 ? <DoneStep {...panel} /> : null}

          {error ? <Box mt={3}><AppAlert severity="error">{error}</AppAlert></Box> : null}

          <Stack direction="row" spacing={2} alignItems="center" mt={4}>
            <Button variant="text" disabled={step === 0 || saving} onClick={() => go(step - 1)}>
              {t('wiz.back')}
            </Button>
            <Box flexGrow={1} />
            {last ? (
              <Button variant="contained" disabled={saving} onClick={finish}>
                {saving ? t('wiz.saving') : t(editing ? 'wiz.saveChanges' : 'wiz.start')}
              </Button>
            ) : (
              <Button variant="contained" disabled={saving} onClick={() => go(step + 1)}>
                {t(definition.optional ? 'wiz.next' : 'wiz.saveNext')}
              </Button>
            )}
          </Stack>
        </Box>
      </BlankCard>
    </Container>
  );
};

export default WelcomePage;
