import { useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { updateSettings, type Settings } from '../../api/client';
import { AppAlert } from '../../components/ui';
import { t } from '../../i18n';

interface MailSectionProps {
  settings: Settings;
  onSaved: (next: Settings, message: string) => void;
}

const MailSection = ({ settings, onSaved }: MailSectionProps) => {
  const [to, setTo] = useState(settings.mailTo);
  const [onlyNew, setOnlyNew] = useState(settings.mailOnlyNewOffers);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = to !== settings.mailTo || onlyNew !== settings.mailOnlyNewOffers;

  const save = (): void => {
    setSaving(true);
    setError(null);
    updateSettings({ mailTo: to.trim(), mailOnlyNewOffers: onlyNew })
      .then((next) => onSaved(next, t('set.saved')))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setSaving(false));
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="textSecondary">{t('set.mail.help')}</Typography>

      {settings.mailConfigured ? null : <AppAlert severity="warning">{t('set.mail.missing')}</AppAlert>}

      <TextField
        size="small"
        type="email"
        label={t('set.mail.to')}
        value={to}
        onChange={(event) => setTo(event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ maxWidth: 420 }}
      />

      {to.trim() === '' ? (
        <Typography variant="caption" color="text.secondary">{t('set.mail.empty')}</Typography>
      ) : null}

      <Box>
        <FormControlLabel
          control={
            <Checkbox size="small" checked={onlyNew} onChange={(event) => setOnlyNew(event.target.checked)} />
          }
          label={t('set.mail.onlyNew')}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 3.75, maxWidth: 620 }}>
          {t('set.mail.onlyNew.help')}
        </Typography>
      </Box>

      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      <Box>
        <Button variant="contained" disabled={!dirty || saving} onClick={save}>
          {t('int.save')}
        </Button>
      </Box>
    </Stack>
  );
};

export default MailSection;
