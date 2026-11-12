import { Box, Typography } from '@mui/material';
import { AppAlert } from '../../components/ui';
import { runFailureAdvice, runFailureLabel } from '../../labels';
import { RunStatus, type RunInfo } from '../../types';

interface LastRunAlertProps {
  lastRun: RunInfo | null;
}

const LastRunAlert = ({ lastRun }: LastRunAlertProps) => {
  if (!lastRun?.failure) return null;
  const failed = lastRun.status === RunStatus.Error;

  return (
    <Box mb={2}>
      <AppAlert severity={failed ? 'error' : 'warning'}>
        <Typography variant="subtitle2" component="span" fontWeight={600}>
          {runFailureLabel(lastRun.failure)}
        </Typography>
        {' — '}
        {runFailureAdvice(lastRun.failure, lastRun.source)}
        {lastRun.error ? (
          <Typography variant="caption" display="block" mt={0.5} sx={{ opacity: 0.8, wordBreak: 'break-word' }}>
            {lastRun.error}
          </Typography>
        ) : null}
      </AppAlert>
    </Box>
  );
};

export default LastRunAlert;
