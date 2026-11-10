import { Box, Typography } from '@mui/material';
import { AppAlert } from '../../components/ui';
import { runFailureAdvice, runFailureLabel } from '../../labels';
import { RunFailure, RunStatus, type RunInfo } from '../../types';

interface LastRunAlertProps {
  lastRun: RunInfo | null;
}

/**
 * El aviso de que la última pasada no fue bien, con QUÉ HACER.
 *
 * Existe porque el fallo más común —la sesión caducada— no se veía en ninguna
 * parte: el dashboard seguía mostrando las ofertas viejas como si todo
 * marchara, y la única pista estaba en el log del servidor. Una sesión caída
 * que tarda tres días en descubrirse son tres días sin ofertas.
 *
 * Una pasada PARCIAL (una plataforma entregó, otra se cayó) también aparece,
 * en tono de aviso y no de error: el dashboard tiene datos, pero algo hay que
 * arreglar.
 */
const LastRunAlert = ({ lastRun }: LastRunAlertProps) => {
  if (!lastRun?.failure) return null;
  const failed = lastRun.status === RunStatus.Error;
  const urgent = lastRun.failure === RunFailure.LoginRequired;

  return (
    <Box mb={2}>
      <AppAlert severity={failed ? 'error' : 'warning'}>
        <Typography variant="subtitle2" component="span" fontWeight={600}>
          {urgent ? runFailureLabel[RunFailure.LoginRequired] : runFailureLabel[lastRun.failure]}
        </Typography>
        {' — '}
        {runFailureAdvice[lastRun.failure]}
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
