import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { AppChip } from '../../components/ui';
import type { Job } from '../../types';
import { rejectionCategory, rejectionText } from './rejectionReason';

interface RejectionBadgeProps {
  job: Job;
}

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
