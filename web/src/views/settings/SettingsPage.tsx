import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { language, t, type Language, type TranslationKey } from '../../i18n';
import { getSettings, saveOnboardingStep, updateSettings, type Settings } from '../../api/client';
import { AppAlert, BlankCard, PageContainer } from '../../components/ui';

const PLACEHOLDERS = [
  { token: '{puesto}', help: 'set.placeholder.role' },
  { token: '{empresa}', help: 'set.placeholder.company' },
  { token: '{tecnologias}', help: 'set.placeholder.tech' },
];

const MIN_CHARS = 50;
const MAX_CHARS = 1000;

const SettingsPage = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [template, setTemplate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [months, setMonths] = useState('');

  useEffect(() => {
    getSettings()
      .then((loaded) => {
        setSettings(loaded);
        setTemplate(loaded.motivationTemplate);
        setMonths(String(loaded.maxAgeMonths));
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  const changeLanguage = async (next: Language): Promise<void> => {
    await saveOnboardingStep({ language: next });
    window.location.reload();
  };

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

  const badMonths = !Number.isInteger(Number(months)) || Number(months) < 1 || Number(months) > 24;

  const saveMonths = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSettings({ maxAgeMonths: Number(months) });
      setSettings(updated);
      setMonths(String(updated.maxAgeMonths));
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
      breadcrumbs={[{ title: t('set.title') }]}
    >
      <Stack spacing={3}>
        {error ? <AppAlert severity="error">{error}</AppAlert> : null}
        {saved ? <AppAlert severity="info">{t('set.saved')}</AppAlert> : null}

        <BlankCard>
          <Stack spacing={2} p={3}>
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
            </Stack>
          </Stack>
        </BlankCard>

        <BlankCard>
          <Stack spacing={2} p={3}>
            <Box>
              <Typography variant="h5">{t('set.maxAge')}</Typography>
              <Typography variant="body2" color="textSecondary">
                {t('set.maxAge.help')}
              </Typography>
            </Box>
            <TextField
              type="number"
              label={t('set.months')}
              value={months}
              onChange={(event) => setMonths(event.target.value)}
              disabled={settings === null || saving}
              error={badMonths}
              helperText={badMonths ? t('set.months.invalid') : t('set.months.hint')}
              sx={{ maxWidth: 200 }}
            />
            <Box>
              <Button
                variant="contained"
                disabled={saving || badMonths || settings === null || Number(months) === settings.maxAgeMonths}
                onClick={() => void saveMonths()}
              >
                {t('set.saveMaxAge')}
              </Button>
            </Box>
          </Stack>
        </BlankCard>

        <BlankCard>
          <Stack spacing={1.5} p={3} alignItems="flex-start">
            <Typography variant="h5">{t('set.language')}</Typography>
            <Typography variant="body2" color="textSecondary">{t('set.language.help')}</Typography>
            <TextField
              select
              size="small"
              value={language()}
              onChange={(event) => void changeLanguage(event.target.value as Language)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="es">Español</MenuItem>
              <MenuItem value="en">English</MenuItem>
            </TextField>
          </Stack>
        </BlankCard>

        <BlankCard>
          <Stack spacing={1.5} p={3} alignItems="flex-start">
            <Typography variant="h5">{t('set.profile')}</Typography>
            <Typography variant="body2" color="textSecondary">
              {t('set.profile.help')}
            </Typography>
            <Button variant="outlined" component={RouterLink} to="/bienvenida?editar=1">
              {t('set.profile.edit')}
            </Button>
          </Stack>
        </BlankCard>

        <BlankCard>
          <Stack spacing={1} p={3}>
            <Typography variant="h5">{t('set.account')}</Typography>
            <Typography variant="body2" color="textSecondary">
              Desde dónde se abre Gmail al escribirle a quien contrata. Se cambia en el{' '}
              <Typography component="span" variant="mono">.env</Typography> del servidor
              (<Typography component="span" variant="mono">GMAIL_ACCOUNT</Typography>), porque es una
              credencial y no un texto.
            </Typography>
            <Typography variant="body2">{settings?.gmailAccount ?? t('set.account.unset')}</Typography>
          </Stack>
        </BlankCard>
      </Stack>
    </PageContainer>
  );
};

export default SettingsPage;
