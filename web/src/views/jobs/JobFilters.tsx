import { t } from '../../i18n';
import { Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';

export interface FilterValues {
  q: string;
  hasApply: boolean;
}

interface JobFiltersProps {
  values: FilterValues;
  onChange: (next: FilterValues) => void;
}

const JobFilters = ({ values, onChange }: JobFiltersProps) => (
  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} mb={2}>
    <TextField
      size="small"
      label={t('filters.search')}
      value={values.q}
      onChange={(event) => onChange({ ...values, q: event.target.value })}
      sx={{ minWidth: 240 }}
    />
    <FormControlLabel
      control={
        <Checkbox
          size="small"
          checked={values.hasApply}
          onChange={(event) => onChange({ ...values, hasApply: event.target.checked })}
        />
      }
      label={t('filters.onlyApplicable')}
    />
  </Stack>
);

export default JobFilters;
