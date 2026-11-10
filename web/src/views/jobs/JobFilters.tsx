import { Checkbox, FormControlLabel, MenuItem, Stack, TextField } from '@mui/material';
import { findEnumValue } from '../../enumValue';
import { jobStatusLabel } from '../../labels';
import { JobStatus } from '../../types';

export interface FilterValues {
  status: JobStatus | '';
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
      label="Buscar en el texto"
      value={values.q}
      onChange={(event) => onChange({ ...values, q: event.target.value })}
      sx={{ minWidth: 240 }}
    />
    <TextField
      select
      size="small"
      label="Estado"
      value={values.status}
      onChange={(event) => onChange({ ...values, status: findEnumValue(Object.values(JobStatus), event.target.value) ?? '' })}
      sx={{ minWidth: 180 }}
    >
      <MenuItem value="">Todas</MenuItem>
      {Object.values(JobStatus).map((status) => (
        <MenuItem key={status} value={status}>
          {jobStatusLabel[status]}
        </MenuItem>
      ))}
    </TextField>
    <FormControlLabel
      control={
        <Checkbox
          checked={values.hasApply}
          onChange={(event) => onChange({ ...values, hasApply: event.target.checked })}
        />
      }
      label="Solo con vía de postulación"
    />
  </Stack>
);

export default JobFilters;
