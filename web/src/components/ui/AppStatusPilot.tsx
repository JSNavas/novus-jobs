import { Box, Stack, Typography } from '@mui/material';

export type AppStatusTone = 'success' | 'error' | 'neutral';

interface AppStatusPilotProps {
  tone: AppStatusTone;
  label?: string;
}

const pilotColor = {
  success: 'success.main',
  error: 'error.main',
  neutral: 'text.secondary',
} as const;

/*
 * El piloto es una luz, no el mensaje: el texto va al lado y es el que se lee
 * sin color. Por eso el fallo lleva también el rótulo en rojo y en negrita.
 */
const AppStatusPilot = ({ tone, label }: AppStatusPilotProps) => {
  const light = (
    <Box
      component="span"
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
