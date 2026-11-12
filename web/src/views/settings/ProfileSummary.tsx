import { useEffect, useState } from 'react';
import {
  Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { saveOnboardingStep, type CandidateProfile, type OnboardingState } from '../../api/client';
import { AppAlert, AppChip } from '../../components/ui';
import { distinctTech, hasTech, removeTech } from '../../distinctTech';
import { t } from '../../i18n';

const VISIBLE = 12;

interface Draft {
  core: string[];
  stack: string[];
  cannotDo: string[];
  english: CandidateProfile['english'];
  geo: CandidateProfile['geo'];
  modality: CandidateProfile['modality'];
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

  const initial = (): Draft => ({
    core: [...profile.core],
    stack: [...profile.stack],
    cannotDo: [...profile.cannotDo],
    english: { ...profile.english },
    geo: { ...profile.geo },
    modality: { ...profile.modality },
  });

  const [lists, setLists] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setLists(initial()); }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = (['core', 'stack', 'cannotDo'] as const)
      .some((field) => lists[field].join('|') !== profile[field].join('|'))
    || JSON.stringify(lists.english) !== JSON.stringify(profile.english)
    || JSON.stringify(lists.geo) !== JSON.stringify(profile.geo)
    || JSON.stringify(lists.modality) !== JSON.stringify(profile.modality);

  const change = (field: 'core' | 'stack' | 'cannotDo', next: string[]): void => {
    setLists((prev) => ({ ...prev, [field]: next }));
  };

  const save = (): void => {
    setSaving(true);
    setError(null);
    saveOnboardingStep({
      core: lists.core,
      stack: lists.stack,
      cannotDo: lists.cannotDo,
      english: lists.english,
      geo: lists.geo,
      modality: lists.modality,
    })
      .then(() => onSaved(t('set.saved')))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setSaving(false));
  };

  const chosenCountry = catalogue.countries.find((c) => c.code === lists.geo.country);
  const cityOptions = [
    ...(chosenCountry?.cities ?? []),
    // Si la ciudad guardada no está en la lista —vino del CV, por ejemplo— no se pierde.
    ...(lists.geo.city && !(chosenCountry?.cities ?? []).includes(lists.geo.city) ? [lists.geo.city] : []),
  ];

  const MODALITIES = [
    { key: 'remoteGlobal', label: 'dash.criteria.remoteGlobal' },
    { key: 'remoteHomeCountry', label: 'dash.criteria.remoteHome' },
    { key: 'hybrid', label: 'dash.criteria.hybrid' },
    { key: 'onsite', label: 'dash.criteria.onsite' },
  ] as const;

  const editor = (field: 'core' | 'stack' | 'cannotDo', tone?: 'success' | 'warning') => (
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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5, alignItems: 'start' }}>
        <Box>
        <Field label={t('set.profile.english')}>
          <Stack spacing={1} alignItems="flex-start">
            <TextField
              size="small"
              select
              label={t('set.profile.level')}
              value={lists.english.level}
              onChange={(event) => setLists((prev) => ({
                ...prev,
                english: { ...prev.english, level: event.target.value as CandidateProfile['english']['level'] },
              }))}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 140 }}
            >
              {catalogue.englishLevels.map((level) => (
                <MenuItem key={level} value={level}>{level.toUpperCase()}</MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={lists.english.filter}
                  onChange={(event) => setLists((prev) => ({
                    ...prev,
                    english: { ...prev.english, filter: event.target.checked },
                  }))}
                />
              }
              label={t('set.profile.englishFilter')}
            />
          </Stack>
        </Field>

        <Field label={t('set.profile.modality')}>
          <Stack>
            {MODALITIES.map((option) => (
              <FormControlLabel
                key={option.key}
                control={
                  <Checkbox
                    size="small"
                    checked={lists.modality[option.key]}
                    onChange={(event) => setLists((prev) => ({
                      ...prev,
                      modality: { ...prev.modality, [option.key]: event.target.checked },
                    }))}
                  />
                }
                label={t(option.label)}
              />
            ))}
          </Stack>
        </Field>
        </Box>

        <Box>
        <Field label={t('set.profile.where')}>
          <Stack spacing={1.5} alignItems="flex-start">
            <TextField
              size="small"
              select
              label={t('set.profile.country')}
              value={lists.geo.country}
              onChange={(event) => setLists((prev) => ({
                ...prev,
                geo: { ...prev.geo, country: event.target.value },
              }))}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 200 }}
            >
              {catalogue.countries.map((option) => (
                <MenuItem key={option.code} value={option.code}>{option.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              label={t('set.profile.city')}
              value={lists.geo.city ?? ''}
              onChange={(event) => setLists((prev) => ({
                ...prev,
                geo: { ...prev.geo, city: event.target.value === '' ? null : event.target.value },
              }))}
              helperText={t('set.profile.cityHelp')}
              slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">{t('set.profile.anyCity')}</MenuItem>
              {cityOptions.map((city) => (
                <MenuItem key={city} value={city}>{city}</MenuItem>
              ))}
            </TextField>
            <Stack spacing={0.5} alignItems="flex-start">
              <TextField
                size="small"
                label={t('set.profile.timezone')}
                value={lists.geo.timezone}
                onChange={(event) => setLists((prev) => ({
                  ...prev,
                  geo: { ...prev.geo, timezone: event.target.value.trim() },
                }))}
                helperText={t('set.profile.timezoneHelp')}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ minWidth: 220 }}
              />
              <Button
                size="small"
                variant="text"
                sx={{ alignSelf: 'flex-start' }}
                onClick={() => setLists((prev) => ({
                  ...prev,
                  geo: {
                    ...prev.geo,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  },
                }))}
              >
                {t('set.profile.timezoneMine')}
              </Button>
            </Stack>
          </Stack>
        </Field>


        <Field label={t('set.profile.localOut')}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={lists.geo.excludeLocalEmployers}
                onChange={(event) => setLists((prev) => ({
                  ...prev,
                  geo: { ...prev.geo, excludeLocalEmployers: event.target.checked },
                }))}
              />
            }
            label={t('set.profile.localOut.on')}
          />
        </Field>
        </Box>
      </Box>

      <Stack direction="row" spacing={1} mb={3}>
        <Button variant="contained" size="small" disabled={!dirty || saving} onClick={save}>
          {t('int.save')}
        </Button>
        <Button variant="text" size="small" disabled={!dirty || saving} onClick={() => setLists(initial())}>
          {t('int.cancel')}
        </Button>
      </Stack>


    </Box>
  );
};

export default ProfileSummary;
