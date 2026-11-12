import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { t, type TranslationKey } from '../../i18n';
import {
  getOnboarding, getSettings, updateSettings,
  type OnboardingState, type Settings,
} from '../../api/client';
import { AppAlert, AppSnackbar, BlankCard, PageContainer } from '../../components/ui';
import CvSection from './CvSection';
import MailSection from './MailSection';
import ProfileSummary from './ProfileSummary';

const PLACEHOLDERS = [
  { token: '{puesto}', help: 'set.placeholder.role' },
  { token: '{empresa}', help: 'set.placeholder.company' },
  { token: '{tecnologias}', help: 'set.placeholder.tech' },
];

const SECTIONS = [
  { id: 'perfil', label: 'set.nav.profile' as const },
  { id: 'criterio', label: 'set.nav.criteria' as const },
  { id: 'notificaciones', label: 'set.nav.mail' as const },
  { id: 'candidatura', label: 'set.nav.apply' as const },
];

const MIN_CHARS = 50;
const MAX_CHARS = 1000;

const SettingsPage = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [template, setTemplate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reloadOnboarding = (): void => {
    getOnboarding().then(setOnboarding).catch(() => undefined);
  };

  useEffect(() => {
    getSettings()
      .then((loaded) => {
        setSettings(loaded);
        setTemplate(loaded.motivationTemplate);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
    getOnboarding().then(setOnboarding).catch(() => undefined);
  }, []);

  const save = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSettings({ motivationTemplate: template });
      setSettings(updated);
      setTemplate(updated.motivationTemplate);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };



  const length = template.trim().length;
  const tooShort = length > 0 && length < MIN_CHARS;
  const tooLong = length > MAX_CHARS;
  const dirty = settings !== null && template !== settings.motivationTemplate;

  return (
    <PageContainer
      title={t('set.title')}
      subtitle={t('set.subtitle')}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '180px minmax(0, 1fr)' },
          gap: { xs: 2, md: 4 },
          alignItems: 'start',
        }}
      >
        <Stack
          component="nav"
          spacing={0.5}
          sx={{ position: { md: 'sticky' }, top: 88, display: { xs: 'none', md: 'flex' } }}
        >
          {SECTIONS.map((section) => (
            <Button
              key={section.id}
              href={`#${section.id}`}
              size="small"
              sx={{ justifyContent: 'flex-start', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              {t(section.label)}
            </Button>
          ))}
        </Stack>

      <Stack spacing={3}>
        {error ? <AppAlert severity="error">{error}</AppAlert> : null}
        {saved ? <AppAlert severity="info">{t('set.saved')}</AppAlert> : null}

        <BlankCard>
          <Stack spacing={2} p={3} sx={{ scrollMarginTop: 96 }} id="perfil">
            <Typography variant="h5">{t('set.cv.title')}</Typography>
            {onboarding ? (
              <CvSection
                onboarding={onboarding}
                onApplied={(message) => { setNotice(message); reloadOnboarding(); }}
                onUploaded={reloadOnboarding}
              />
            ) : null}
          </Stack>
        </BlankCard>

        <BlankCard>
          <Stack spacing={2} p={3} sx={{ scrollMarginTop: 96 }} id="criterio">
            <Box>
              <Typography variant="h5">{t('set.nav.criteria')}</Typography>
              <Typography variant="body2" color="textSecondary">{t('set.profile.editable')}</Typography>
            </Box>
            {onboarding ? (
              <ProfileSummary
                onboarding={onboarding}
                onSaved={(message) => { setNotice(message); reloadOnboarding(); }}
              />
            ) : null}
            <Box>
              <Button variant="outlined" component={RouterLink} to="/bienvenida?editar=1">
                {t('set.profile.edit')}
              </Button>
            </Box>
          </Stack>
        </BlankCard>

        <BlankCard>
          <Stack spacing={2} p={3} sx={{ scrollMarginTop: 96 }} id="notificaciones">
            <Typography variant="h5">{t('set.mail.title')}</Typography>
            {settings ? (
              <MailSection
                settings={settings}
                onSaved={(next, message) => { setSettings(next); setNotice(message); }}
              />
            ) : null}
          </Stack>
        </BlankCard>

        <BlankCard>
          <Stack spacing={2} p={3} sx={{ scrollMarginTop: 96 }} id="candidatura">
            <Box>
              <Typography variant="h5">{t('set.motivation')}</Typography>
              <Typography variant="body2" color="textSecondary">
                {t('set.motivation.help')}
              </Typography>
            </Box>

            <TextField
              multiline
              minRows={10}
              fullWidth
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
              disabled={settings === null || saving}
              error={tooShort || tooLong}
              helperText={
                tooLong
                  ? t('set.chars.tooLong', { length, max: MAX_CHARS })
                  : tooShort
                    ? t('set.chars.tooShort', { length, min: MIN_CHARS })
                    : t('set.chars.ok', { length })
              }
            />

            <Box>
              <Typography variant="body2" gutterBottom>
                {t('set.placeholders')}
              </Typography>
              {PLACEHOLDERS.map((placeholder) => (
                <Typography key={placeholder.token} variant="body2" color="textSecondary">
                  <Typography component="span" variant="mono">{placeholder.token}</Typography>
                  {` — ${t(placeholder.help as TranslationKey)}`}
                </Typography>
              ))}
              <Typography variant="body2" color="textSecondary" mt={1}>
                Si una oferta no coincide con ninguna tecnología, la frase que lleva{' '}
                <Typography component="span" variant="mono">{'{tecnologias}'}</Typography> se quita
                entera en vez de quedarse a medias. Por eso conviene que vaya en su propia frase.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button variant="contained" disabled={!dirty || saving || tooShort || tooLong} onClick={() => void save()}>
                {saving ? t('set.saving') : t('set.save')}
              </Button>
              <Button
                variant="outlined"
                disabled={saving || settings === null || template === settings.defaultMotivationTemplate}
                onClick={() => setTemplate(settings?.defaultMotivationTemplate ?? '')}
              >
                {t('set.resetDefault')}
              </Button>
              <Button
                variant="text"
                disabled={saving || !dirty}
                onClick={() => setTemplate(settings?.motivationTemplate ?? '')}
              >
                {t('int.cancel')}
              </Button>
            </Stack>
          </Stack>
        </BlankCard>

        <AppSnackbar message={notice} severity="success" onClose={() => setNotice(null)} />
      </Stack>
      </Box>
    </PageContainer>
  );
};

export default SettingsPage;
