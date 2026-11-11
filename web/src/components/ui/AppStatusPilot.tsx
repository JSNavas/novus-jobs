import { Box, Stack, Typography } from '@mui/material';

export type AppStatusTone = 'success' | 'error' | 'neutral';

interface AppStatusPilotProps {
  tone: AppStatusTone;
  label?: string;
  /** Accessible name when the pilot is a bare dot without visible text. */
  srLabel?: string;
}

const pilotColor = {
  success: 'success.main',
  error: 'error.main',
  neutral: 'text.secondary',
} as const;

/*
 * The pilot is a light, not the message: the text sits beside it and is what
 * gets read without color. That is why failure also gets its label in red and bold.
 */
const AppStatusPilot = ({ tone, label, srLabel }: AppStatusPilotProps) => {
  const light = (
    <Box
      component="span"
      role={label ? undefined : 'img'}
      aria-label={label ? undefined : srLabel}
      sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: pilotColor[tone], flexShrink: 0 }}
    />
  );
  if (!label) return light;
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {light}
      <Typography
        variant="body2"
        color={tone === 'error' ? 'error.main' : 'text.primary'}
        fontWeight={tone === 'error' ? 600 : 400}
      >
        {label}
      </Typography>
    </Stack>
  );
};

export default AppStatusPilot;
