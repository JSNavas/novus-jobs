import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { AppChip } from '../../components/ui';
import type { Job } from '../../types';
import { rejectionCategory, rejectionText } from './rejectionReason';

interface RejectionBadgeProps {
  /**
   * La oferta entera y no su frase: el motivo se escribe aquí, a partir del
   * código que mandó el servidor, en el idioma de quien está mirando.
   */
  job: Job;
}

/**
 * The category reads at a glance; the full reason is in the tooltip and in the
 * line below. The tooltip is mouse-only, so the visible line is what keyboard
 * and screen reader users get. The chip is not focusable on purpose: it would
 * be a tab stop with no announced purpose, and the reason is already on screen.
 */
const RejectionBadge = ({ job }: RejectionBadgeProps) => {
  const { label, tone } = rejectionCategory(job);
  const reason = rejectionText(job);

  return (
    <Stack spacing={0.5} alignItems="flex-start">
      <Tooltip title={reason} describeChild>
        <Box component="span" sx={{ display: 'inline-flex' }}>
          <AppChip label={label} tone={tone} />
        </Box>
      </Tooltip>
      <Typography variant="caption" color="textSecondary">
        {reason}
      </Typography>
    </Stack>
  );
};

export default RejectionBadge;
