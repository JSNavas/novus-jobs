import { Box, Skeleton, Stack } from '@mui/material';
import { BlankCard } from '../../components/ui';

const JobSkeleton = () => (
  <BlankCard>
    <Box sx={{ px: 2.5, py: 2.375 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Skeleton variant="rounded" width={34} height={34} sx={{ flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width="48%" height={22} />
          <Skeleton variant="text" width="34%" height={14} />
        </Box>
        <Skeleton variant="text" width={72} height={14} />
      </Stack>

      <Box sx={{ mt: 1.875, mb: 1.5 }}>
        <Skeleton variant="text" width="96%" height={14} />
        <Skeleton variant="text" width="72%" height={14} />
      </Box>

      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Stack direction="row" spacing={0.75}>
          <Skeleton variant="rounded" width={62} height={23} />
          <Skeleton variant="rounded" width={74} height={23} />
          <Skeleton variant="rounded" width={120} height={23} />
        </Stack>
        <Skeleton variant="rounded" width={180} height={30} />
      </Stack>
    </Box>
  </BlankCard>
);

export default JobSkeleton;
