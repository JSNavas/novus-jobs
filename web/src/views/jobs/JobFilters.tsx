import { Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';

/**
 * El estado YA NO está aquí: lo elige el menú lateral, que es donde se ve.
 * Tenerlo en los dos sitios dejaría dos mandos para lo mismo y, en cuanto
 * discreparan, el usuario no sabría cuál manda.
 */
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
      label="Buscar en el texto"
      value={values.q}
      onChange={(event) => onChange({ ...values, q: event.target.value })}
      sx={{ minWidth: 240 }}
    />
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
