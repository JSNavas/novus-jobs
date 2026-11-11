import { Chip } from '@mui/material';

export type AppChipTone = 'success' | 'warning' | 'error' | 'neutral';

interface AppChipProps {
  label: string;
  tone?: AppChipTone;
}

const toneColor = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  neutral: 'default',
} as const;

const AppChip = ({ label, tone = 'neutral' }: AppChipProps) => (
  <Chip size="small" label={label} color={toneColor[tone]} variant="outlined" />
);

export default AppChip;
