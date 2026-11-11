import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { getSettings, updateSettings, type Settings } from '../../api/client';
import { AppAlert, BlankCard, PageContainer } from '../../components/ui';

/**
 * CONFIGURACIÓN — por ahora, el párrafo de las postulaciones.
 *
 * Existe porque ese texto se corrigió cinco veces en una tarde, y cada
 * corrección era un cambio de código y un despliegue. Una frase que no suena
 * como él no es un error de programación: es algo que tiene que poder
 * arreglar quien la escribe, cuando la lee.
 */

const PLACEHOLDERS = [
  { token: '{puesto}', help: 'el rol de la oferta, p. ej. «Developer Full-Stack»' },
  { token: '{empresa}', help: 'quién contrata. En LinkedIn no siempre se sabe: ahí pone «la empresa»' },
  { token: '{tecnologias}', help: 'hasta cuatro coincidencias reales con tu stack' },
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
      title="Configuración"
      subtitle="Lo que puedes cambiar sin tocar el código"
      breadcrumbs={[{ title: 'Configuración' }]}
    >
      <Stack spacing={3}>
        {error ? <AppAlert severity="error">{error}</AppAlert> : null}
        {saved ? <AppAlert severity="info">Guardado. Las ofertas ya usan este texto.</AppAlert> : null}

        <BlankCard>
          <Stack spacing={2} p={3}>
            <Box>
              <Typography variant="h5">Motivación de las postulaciones</Typography>
              <Typography variant="body2" color="textSecondary">
                El texto que copia el botón «Copiar motivación» de cada oferta, para pegarlo en el
                «¿por qué te interesa trabajar aquí?». Lo que escribas aquí es lo que se pega.
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
                  ? `${length} caracteres: el formulario admite ${MAX_CHARS} como mucho`
                  : tooShort
                    ? `${length} caracteres: el formulario pide al menos ${MIN_CHARS}`
                    : `${length} caracteres. Al rellenar los huecos crece un poco.`
              }
            />

            <Box>
              <Typography variant="body2" gutterBottom>
                Huecos que se rellenan con los datos de cada oferta:
              </Typography>
              {PLACEHOLDERS.map((placeholder) => (
                <Typography key={placeholder.token} variant="body2" color="textSecondary">
                  <Typography component="span" variant="mono">{placeholder.token}</Typography>
                  {` — ${placeholder.help}`}
                </Typography>
              ))}
              {/* Que una frase entera desaparezca no es obvio, y si no se dice
                  aquí se descubre el día que una oferta no casa con nada. */}
              <Typography variant="body2" color="textSecondary" mt={1}>
                Si una oferta no coincide con ninguna tecnología, la frase que lleva{' '}
                <Typography component="span" variant="mono">{'{tecnologias}'}</Typography> se quita
                entera en vez de quedarse a medias. Por eso conviene que vaya en su propia frase.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button variant="contained" disabled={!dirty || saving || tooShort || tooLong} onClick={() => void save()}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button
                variant="outlined"
                disabled={saving || settings === null || template === settings.defaultMotivationTemplate}
                onClick={() => setTemplate(settings?.defaultMotivationTemplate ?? '')}
              >
                Volver a la de fábrica
              </Button>
            </Stack>
          </Stack>
        </BlankCard>

        {/* EL FILTRO DE LA BÚSQUEDA, no el de la pantalla de Enfoque. Esto
            decide qué se guarda; la ventana con la que se analiza lo ya
            guardado se elige en la propia página de Enfoque. */}
        <BlankCard>
          <Stack spacing={2} p={3}>
            <Box>
              <Typography variant="h5">Antigüedad máxima de las vacantes</Typography>
              <Typography variant="body2" color="textSecondary">
                Una vacante publicada hace más de esto no entra. Con 969 postulaciones acumuladas,
                escribirle a una oferta de hace un año es tirar el tiempo — y entierra la de ayer.
              </Typography>
            </Box>
            <TextField
              type="number"
              label="Meses"
              value={months}
              onChange={(event) => setMonths(event.target.value)}
              disabled={settings === null || saving}
              error={badMonths}
              helperText={badMonths ? 'Entre 1 y 24 meses' : 'Se aplica desde la siguiente búsqueda.'}
              sx={{ maxWidth: 200 }}
            />
            <Box>
              <Button
                variant="contained"
                disabled={saving || badMonths || settings === null || Number(months) === settings.maxAgeMonths}
                onClick={() => void saveMonths()}
              >
                Guardar antigüedad
              </Button>
            </Box>
          </Stack>
        </BlankCard>

        <BlankCard>
          <Stack spacing={1.5} p={3} alignItems="flex-start">
            <Typography variant="h5">Tu perfil</Typography>
            <Typography variant="body2" color="textSecondary">
              Tu stack, tu núcleo, los vetos, el inglés y desde dónde buscas. Es lo que decide qué
              oferta te llega y qué se descarta, y se edita en la misma pantalla del alta: así no
              hay dos formularios que puedan decir cosas distintas. Los cambios se aplican en la
              siguiente búsqueda, sin reiniciar nada.
            </Typography>
            <Button variant="outlined" component={RouterLink} to="/bienvenida?editar=1">
              Editar mi perfil
            </Button>
          </Stack>
        </BlankCard>

        <BlankCard>
          <Stack spacing={1} p={3}>
            <Typography variant="h5">Cuenta de postulación</Typography>
            <Typography variant="body2" color="textSecondary">
              Desde dónde se abre Gmail al escribirle a quien contrata. Se cambia en el{' '}
              <Typography component="span" variant="mono">.env</Typography> del servidor
              (<Typography component="span" variant="mono">GMAIL_ACCOUNT</Typography>), porque es una
              credencial y no un texto.
            </Typography>
            <Typography variant="body2">{settings?.gmailAccount ?? 'sin configurar'}</Typography>
          </Stack>
        </BlankCard>
      </Stack>
    </PageContainer>
  );
};

export default SettingsPage;
