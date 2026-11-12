import { t } from '../../i18n';
import { Checkbox, FormControlLabel, IconButton, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { IconSearch, IconX } from '@tabler/icons-react';
import { Tooltip } from '@mui/material';
import type { Integration } from '../../api/client';

export type DateWindow = 'all' | 'today' | 'week';

export interface FilterValues {
  q: string;
  hasApply: boolean;
  source: string;
  date: DateWindow;
}

export function sinceOfWindow(window: DateWindow): string | undefined {
  if (window === 'all') return undefined;
  if (window === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  return new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
}

export const MAX_AGE_OPTIONS = [1, 2, 3, 6, 12];

interface JobFiltersProps {
  values: FilterValues;
  integrations?: readonly Integration[];
  maxAgeMonths?: number | null;
  onChange: (next: FilterValues) => void;
  onMaxAgeChange?: (months: number) => void;
}

const JobFilters = ({
  values, integrations = [], maxAgeMonths = null, onChange, onMaxAgeChange,
}: JobFiltersProps) => (
  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} mb={2.5}>
    <TextField
      size="small"
      placeholder={t('filters.search')}
      value={values.q}
      onChange={(event) => onChange({ ...values, q: event.target.value })}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <IconSearch size={16} stroke={1.6} />
            </InputAdornment>
          ),
          endAdornment: values.q ? (
            <InputAdornment position="end">
              <Tooltip title={t('filters.search.clear')}>
                <IconButton
                  size="small"
                  aria-label={t('filters.search.clear')}
                  onClick={() => onChange({ ...values, q: '' })}
                  sx={{ opacity: 0.6 }}
                >
                  <IconX size={15} stroke={1.8} />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ) : null,
        },
        htmlInput: { 'aria-label': t('filters.search') },
      }}
      sx={{ flex: 1 }}
    />

    <TextField
      size="small"
      select
      label={t('filters.platform')}
      value={values.source}
      onChange={(event) => onChange({ ...values, source: event.target.value })}
      slotProps={{ inputLabel: { shrink: true } }}
      sx={{ minWidth: 165 }}
    >
      <MenuItem value="all">{t('filters.platform.all')}</MenuItem>
      {integrations.map((integration) => (
        <MenuItem key={integration.name} value={integration.name}>{integration.label}</MenuItem>
      ))}
    </TextField>

    <TextField
      size="small"
      select
      label={t('filters.date')}
      value={values.date}
      onChange={(event) => onChange({ ...values, date: event.target.value as DateWindow })}
      slotProps={{ inputLabel: { shrink: true } }}
      sx={{ minWidth: 165 }}
    >
      <MenuItem value="all">{t('filters.date.all')}</MenuItem>
      <MenuItem value="today">{t('filters.date.today')}</MenuItem>
      <MenuItem value="week">{t('filters.date.week')}</MenuItem>
    </TextField>

    {maxAgeMonths !== null && onMaxAgeChange ? (
      <Tooltip title={t('filters.maxAge.help')}>
        <TextField
          size="small"
          select
          label={t('filters.maxAge')}
          value={maxAgeMonths}
          onChange={(event) => onMaxAgeChange(Number(event.target.value))}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 150 }}
        >
          {MAX_AGE_OPTIONS.map((months) => (
            <MenuItem key={months} value={months}>{t('filters.maxAge.option', { months })}</MenuItem>
          ))}
        </TextField>
      </Tooltip>
    ) : null}

    <FormControlLabel
      control={
        <Checkbox
          size="small"
          checked={values.hasApply}
          onChange={(event) => onChange({ ...values, hasApply: event.target.checked })}
        />
      }
      label={t('filters.onlyApplicable')}
      sx={{ whiteSpace: 'nowrap' }}
    />
  </Stack>
);

export default JobFilters;
