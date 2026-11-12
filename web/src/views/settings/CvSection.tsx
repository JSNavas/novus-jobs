import { useRef, useState } from 'react';
import {
  Box, Button, Checkbox, CircularProgress, FormControlLabel, Stack, Typography,
} from '@mui/material';
import { IconFileText, IconUpload } from '@tabler/icons-react';
import {
  saveOnboardingStep, uploadCv, type CvReading, type OnboardingState,
} from '../../api/client';
import { AppAlert, AppChip } from '../../components/ui';
import { formatDate } from '../../format';
import { t } from '../../i18n';

interface CvSectionProps {
  onboarding: OnboardingState;
  onApplied: (message: string) => void;
}

const sameTech = (a: string, b: string): boolean =>
  a.toLowerCase().replace(/[.\s_-]/g, '') === b.toLowerCase().replace(/[.\s_-]/g, '');

const CvSection = ({ onboarding, onApplied }: CvSectionProps) => {
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState<CvReading | null>(null);
  const [busy, setBusy] = useState(false);
  const [enhance, setEnhance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = onboarding.profile;

  const newTech = reading
    ? [...reading.stack, ...reading.core].filter(
      (tech, index, all) =>
        all.findIndex((other) => sameTech(other, tech)) === index
        && !profile.stack.some((mine) => sameTech(mine, tech)),
    )
    : [];

  const newEnglish = reading?.english && reading.english !== profile.english.level
    ? reading.english
    : null;

  const nothingNew = reading !== null && newTech.length === 0 && newEnglish === null;

  const read = (file: File): void => {
    setBusy(true);
    setError(null);
    setReading(null);
    uploadCv(file, enhance)
      .then(setReading)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setBusy(false));
  };

  const apply = (): void => {
    setBusy(true);
    setError(null);
    saveOnboardingStep({
      stack: [...profile.stack, ...newTech],
      ...(newEnglish ? { english: { level: newEnglish, filter: profile.english.filter } } : {}),
    })
      .then(() => { setReading(null); onApplied(t('set.cv.applied')); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setBusy(false));
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="textSecondary">{t('set.cv.help')}</Typography>

      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 1, p: 2 }}
      >
        <IconFileText size={22} stroke={1.5} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2">
            {onboarding.cv ? onboarding.cv.name : t('set.cv.none')}
          </Typography>
          {onboarding.cv ? (
            <Typography variant="caption" color="text.secondary">
              {t('set.cv.stored', { date: formatDate(onboarding.cv.updatedAt) })}
            </Typography>
          ) : null}
        </Box>
        <input
          type="file"
          hidden
          ref={input}
          accept={onboarding.acceptedFiles.join(',')}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) read(file);
            event.target.value = '';
          }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={busy ? <CircularProgress size={14} /> : <IconUpload size={15} stroke={1.6} />}
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? t('set.cv.reading') : t(onboarding.cv ? 'set.cv.replace' : 'set.cv.upload')}
        </Button>
      </Stack>

      {onboarding.canEnhance ? (
        <FormControlLabel
          control={
            <Checkbox size="small" checked={enhance} onChange={(event) => setEnhance(event.target.checked)} />
          }
          label={t('set.cv.readWith')}
        />
      ) : null}

      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      {nothingNew ? <AppAlert severity="info">{t('set.cv.nothingNew')}</AppAlert> : null}

      {reading && !nothingNew ? (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>{t('set.cv.found')}</Typography>

          {newTech.length ? (
            <Box mb={1.5}>
              <Typography variant="label" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {t('set.cv.newTech')}
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {newTech.map((tech) => <AppChip key={tech} label={tech} tone="success" />)}
              </Stack>
            </Box>
          ) : null}

          {newEnglish ? (
            <Typography variant="body2" mb={1.5}>
              {t('set.cv.newEnglish', {
                before: profile.english.level.toUpperCase(),
                after: newEnglish.toUpperCase(),
              })}
            </Typography>
          ) : null}

          <Stack direction="row" spacing={1}>
            <Button variant="contained" size="small" disabled={busy} onClick={apply}>
              {t('set.cv.apply')}
            </Button>
            <Button variant="text" size="small" disabled={busy} onClick={() => setReading(null)}>
              {t('set.cv.discard')}
            </Button>
          </Stack>
        </Box>
      ) : null}
    </Stack>
  );
};

export default CvSection;
