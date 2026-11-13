import { useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { updateLinkedInSearches } from '../../api/client';
import { AppAlert } from '../../components/ui';
import { t } from '../../i18n';

const MAX = 6;

interface Props {
  urls: readonly string[];
  onSaved: (urls: string[]) => void;
}

export const LinkedInSearchesSection = ({ urls, onSaved }: Props) => {
  const [text, setText] = useState(urls.join('\n'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const tooMany = lines.length > MAX;
  const dirty = text !== urls.join('\n');

  const save = (): void => {
    setSaving(true);
    setError(null);
    setDone(false);
    updateLinkedInSearches(lines)
      .then((next) => { onSaved(next.urls); setText(next.urls.join('\n')); setDone(true); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setSaving(false));
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 12, lineHeight: 1.8, color: 'text.secondary', mb: 2 }}>
        {t('set.linkedin.help')}
      </Typography>

      <TextField
        fullWidth
        multiline
        minRows={3}
        maxRows={8}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="https://www.linkedin.com/jobs/collections/recommended/"
        slotProps={{ htmlInput: { spellCheck: false, style: { fontFamily: 'monospace', fontSize: 12 } } }}
      />

      <Typography sx={{ fontSize: 11, color: tooMany ? 'error.main' : 'text.secondary', mt: 1 }}>
        {t('set.linkedin.count', { count: lines.length, max: MAX })}
      </Typography>

      {error ? <Box sx={{ mt: 2 }}><AppAlert severity="error">{error}</AppAlert></Box> : null}
      {done ? <Box sx={{ mt: 2 }}><AppAlert severity="success">{t('set.linkedin.saved')}</AppAlert></Box> : null}

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="contained" size="small" disabled={!dirty || saving || tooMany} onClick={save}>
          {saving ? t('set.saving') : t('set.save')}
        </Button>
        <Button
          variant="text"
          size="small"
          color="inherit"
          disabled={!dirty || saving}
          onClick={() => { setText(urls.join('\n')); setError(null); setDone(false); }}
        >
          {t('int.cancel')}
        </Button>
      </Stack>
    </Box>
  );
};
