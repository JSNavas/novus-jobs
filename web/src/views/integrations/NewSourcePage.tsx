import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box, Button, Chip, CircularProgress, Stack, TextField, Typography,
} from '@mui/material';
import {
  discoverSource, inventSource, previewSource, saveSource,
  type SourceCandidate, type SourcePreview,
} from '../../api/client';
import { AppAlert, PageContainer } from '../../components/ui';
import { t } from '../../i18n';

type Step = 'idle' | 'looking' | 'chosen' | 'saving';

const describeError = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

const NewSourcePage = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<SourceCandidate[]>([]);
  const [descriptor, setDescriptor] = useState<Record<string, unknown> | null>(null);
  const [preview, setPreview] = useState<SourcePreview | null>(null);

  const reset = (): void => {
    setStep('idle');
    setError(null);
    setNotes([]);
    setCandidates([]);
    setDescriptor(null);
    setPreview(null);
  };

  const look = (): void => {
    reset();
    setStep('looking');
    discoverSource(url.trim())
      .then((found) => {
        setNotes(found.notes);
        setCandidates(found.candidates);
        if (found.candidates.length === 1) {
          integrate(found.candidates[0]!.url);
          return;
        }
        setStep('idle');
      })
      .catch((cause: unknown) => { setError(describeError(cause)); setStep('idle'); });
  };

  const integrate = (endpoint: string): void => {
    setStep('looking');
    setError(null);
    inventSource(endpoint)
      .then((result) => {
        setDescriptor(result.descriptor);
        setPreview(result.preview);
        setStep('chosen');
      })
      .catch((cause: unknown) => { setError(describeError(cause)); setStep('idle'); });
  };

  const recheck = (text: string): void => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError(t('src.badJson'));
      return;
    }
    setStep('looking');
    previewSource(parsed)
      .then((result) => {
        setDescriptor(result.descriptor);
        setPreview(result.preview);
        setError(null);
        setStep('chosen');
      })
      .catch((cause: unknown) => { setError(describeError(cause)); setStep('chosen'); });
  };

  const keep = (): void => {
    if (!descriptor) return;
    setStep('saving');
    saveSource(descriptor)
      .then(() => navigate('/integraciones'))
      .catch((cause: unknown) => { setError(describeError(cause)); setStep('chosen'); });
  };

  const busy = step === 'looking' || step === 'saving';

  return (
    <PageContainer title={t('src.title')} subtitle={t('src.subtitle')}>
      <Stack spacing={2.5} sx={{ maxWidth: 900 }}>
        {error ? <AppAlert severity="error" onClose={() => setError(null)}>{error}</AppAlert> : null}

        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
            <TextField
              fullWidth
              size="small"
              label={t('src.url')}
              placeholder="https://..."
              value={url}
              disabled={busy}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter' && url.trim()) look(); }}
            />
            <Button variant="contained" disabled={busy || url.trim() === ''} onClick={look} sx={{ mt: 0.25 }}>
              {t('src.look')}
            </Button>
            <Button variant="text" disabled={busy} onClick={() => { setUrl(''); reset(); }} sx={{ mt: 0.25 }}>
              {t('int.cancel')}
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            {t('src.urlHelp')}
          </Typography>
        </Box>

        {busy ? (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              {step === 'saving' ? t('src.saving') : t('src.working')}
            </Typography>
          </Stack>
        ) : null}

        {notes.length ? (
          <AppAlert severity="info">
            <Stack spacing={0.5}>
              {notes.map((note) => <Typography key={note} variant="body2">{note}</Typography>)}
            </Stack>
          </AppAlert>
        ) : null}

        {candidates.length > 1 ? (
          <Box>
            <Typography variant="subtitle2" mb={1}>{t('src.candidates')}</Typography>
            <Stack spacing={1}>
              {candidates.map((candidate) => (
                <Stack
                  key={candidate.url}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.25 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{candidate.url}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {candidate.how} · {t('src.found', { count: candidate.count })}
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={() => integrate(candidate.url)}>
                    {t('src.use')}
                  </Button>
                </Stack>
              ))}
            </Stack>
          </Box>
        ) : null}

        {descriptor && preview ? (
          <Box>
            <Typography variant="subtitle2" mb={0.5}>
              {t('src.preview', { count: preview.count })}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
              {t('src.previewHelp')}
            </Typography>
            <Stack spacing={1.25} mb={2.5}>
              {preview.posts.map((post) => (
                <Box key={post.text.slice(0, 60)} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{post.text}</Typography>
                </Box>
              ))}
            </Stack>

            <Typography variant="subtitle2" mb={0.5}>{t('src.descriptor')}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {t('src.descriptorHelp')}
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={10}
              maxRows={24}
              defaultValue={JSON.stringify(descriptor, null, 2)}
              key={JSON.stringify(descriptor).length}
              slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 12 } } }}
              onBlur={(event) => recheck(event.target.value)}
            />

            <Stack direction="row" spacing={1} mt={2}>
              <Button variant="contained" disabled={busy || preview.count === 0} onClick={keep}>
                {t('src.keep')}
              </Button>
              <Button variant="text" disabled={busy} onClick={() => navigate('/integraciones')}>
                {t('int.cancel')}
              </Button>
            </Stack>
          </Box>
        ) : null}

        <Box>
          <Typography variant="subtitle2" mb={0.5}>{t('src.help.title')}</Typography>
          <Stack spacing={0.75} mb={1.5}>
            <Typography variant="body2" color="text.secondary">{t('src.help.one')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('src.help.two')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('src.help.three')}</Typography>
          </Stack>
          <Typography variant="subtitle2" mb={0.75}>{t('src.help.tell')}</Typography>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="baseline">
              <Chip size="small" variant="outlined" label={t('src.help.yes')} />
              <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                https://empresa.com/api/v1/jobs?page=1
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="baseline">
              <Chip size="small" variant="outlined" label={t('src.help.no')} />
              <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                https://empresa.com/careers/senior-developer
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </PageContainer>
  );
};

export default NewSourcePage;
