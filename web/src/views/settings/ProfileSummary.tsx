import { useEffect, useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { saveOnboardingStep, type OnboardingState } from '../../api/client';
import { AppAlert, AppChip } from '../../components/ui';
import { distinctTech, hasTech, removeTech } from '../../distinctTech';
import { t } from '../../i18n';

const VISIBLE = 12;

interface Lists {
  core: string[];
  stack: string[];
  cannotDo: string[];
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box sx={{ mb: 2.5 }}>
    <Typography variant="label" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
      {label}
    </Typography>
    {children}
  </Box>
);

const Editable = ({
  items, tone, onRemove, onAdd,
}: {
  items: readonly string[];
  tone?: 'success' | 'warning' | 'neutral';
  onRemove: (item: string) => void;
  onAdd: (item: string) => void;
}) => {
  const [all, setAll] = useState(false);
  const [draft, setDraft] = useState('');
  const unique = distinctTech(items);
  const shown = all ? unique : unique.slice(0, VISIBLE);
  const rest = unique.length - shown.length;

  const add = (): void => {
    const value = draft.trim();
    if (!value) return;
    onAdd(value);
    setDraft('');
  };

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
      {shown.map((item) => (
        <AppChip key={item} label={item} tone={tone} onDelete={() => onRemove(item)} />
      ))}

      {rest > 0 ? (
        <Button size="small" variant="text" onClick={() => setAll(true)} sx={{ minWidth: 0 }}>
          {`+${rest}`}
        </Button>
      ) : null}
      {all && unique.length > VISIBLE ? (
        <Button size="small" variant="text" onClick={() => setAll(false)} sx={{ minWidth: 0 }}>
          {t('card.showLess')}
        </Button>
      ) : null}

      <TextField
        size="small"
        placeholder={t('set.profile.add')}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add(); } }}
        onBlur={add}
        sx={{ width: 180, '& .MuiInputBase-input': { fontSize: 12 } }}
      />
    </Stack>
  );
};

interface ProfileSummaryProps {
  onboarding: OnboardingState;
  onSaved: (message: string) => void;
}

const ProfileSummary = ({ onboarding, onSaved }: ProfileSummaryProps) => {
  const { profile, catalogue } = onboarding;

  const initial = (): Lists => ({
    core: [...profile.core],
    stack: [...profile.stack],
    cannotDo: [...profile.cannotDo],
  });

  const [lists, setLists] = useState<Lists>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setLists(initial()); }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = (['core', 'stack', 'cannotDo'] as const)
    .some((field) => lists[field].join('|') !== profile[field].join('|'));

  const change = (field: keyof Lists, next: string[]): void => {
    setLists((prev) => ({ ...prev, [field]: next }));
  };

  const save = (): void => {
    setSaving(true);
    setError(null);
    saveOnboardingStep({ core: lists.core, stack: lists.stack, cannotDo: lists.cannotDo })
      .then(() => onSaved(t('set.saved')))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setSaving(false));
  };

  const country = catalogue.countries.find((c) => c.code === profile.geo.country)?.label
    ?? profile.geo.country
    ?? '—';

  const modality = [
    profile.modality.remoteGlobal ? t('dash.criteria.remoteGlobal') : null,
    profile.modality.remoteHomeCountry ? t('dash.criteria.remoteHome') : null,
    profile.modality.hybrid ? t('dash.criteria.hybrid') : null,
    profile.modality.onsite ? t('dash.criteria.onsite') : null,
  ].filter(Boolean) as string[];

  const editor = (field: keyof Lists, tone?: 'success' | 'warning') => (
    <Editable
      items={lists[field]}
      tone={tone}
      onRemove={(item) => change(field, removeTech(lists[field], item))}
      onAdd={(item) => {
        if (hasTech(lists[field], item)) return;
        change(field, [...lists[field], item]);
      }}
    />
  );

  return (
    <Box>
      <Field label={t('set.profile.core')}>{editor('core', 'success')}</Field>
      <Field label={t('set.profile.stack')}>{editor('stack')}</Field>
      <Field label={t('set.profile.vetoes')}>{editor('cannotDo', 'warning')}</Field>

      {error ? <Box mb={2}><AppAlert severity="error">{error}</AppAlert></Box> : null}

      <Stack direction="row" spacing={1} mb={3}>
        <Button variant="contained" size="small" disabled={!dirty || saving} onClick={save}>
          {t('int.save')}
        </Button>
        <Button variant="text" size="small" disabled={!dirty || saving} onClick={() => setLists(initial())}>
          {t('int.cancel')}
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5 }}>
        <Field label={t('set.profile.english')}>
          <Typography variant="body2">
            {profile.english.level.toUpperCase()}
            {' · '}
            {t(profile.english.filter ? 'set.profile.englishFilter' : 'set.profile.englishFree')}
          </Typography>
        </Field>

        <Field label={t('set.profile.where')}>
          <Typography variant="body2">
            {[country, profile.geo.city, profile.geo.timezone].filter(Boolean).join(' · ')}
          </Typography>
        </Field>

        <Field label={t('set.profile.modality')}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {modality.map((item) => <AppChip key={item} label={item} />)}
          </Stack>
        </Field>

        <Field label={t('set.profile.localOut')}>
          <Typography variant="body2">{profile.geo.excludeLocalEmployers ? 'Sí' : 'No'}</Typography>
        </Field>
      </Box>
    </Box>
  );
};

export default ProfileSummary;
