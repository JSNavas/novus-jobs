import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { AppChip } from '../../components/ui';
import { rejectionCategory } from './rejectionReason';

interface RejectionBadgeProps {
  reason: string;
}

/**
 * La categoría se lee de un vistazo; el texto completo está en el tooltip y en
 * la línea de abajo. El tooltip solo lo ve quien tiene ratón, así que la línea
 * visible es la que cuenta para teclado y lector de pantalla.
 */
const RejectionBadge = ({ reason }: RejectionBadgeProps) => {
  const { label, tone } = rejectionCategory(reason);

  return (
    <Stack spacing={0.5} alignItems="flex-start">
      <Tooltip title={reason}>
        <Box
          component="span"
          tabIndex={0}
          sx={{
            display: 'inline-flex',
            borderRadius: 1,
            '&:focus-visible': { outline: '1px solid', outlineColor: 'primary.main', outlineOffset: 2 },
          }}
        >
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
