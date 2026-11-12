import { Box, Stack, Typography } from '@mui/material';
import { IconArrowUpRight } from '@tabler/icons-react';
import { NavLink } from 'react-router';
import type { Job } from '../../types';
import { formatTime } from '../../format';
import { t } from '../../i18n';
import { jobSourceLabel } from '../../labels';

const initialOf = (job: Job): string => (job.company ?? job.author ?? job.source).trim().slice(0, 1).toUpperCase();

const RecentJobs = ({ jobs }: { jobs: Job[] }) => {
  if (jobs.length === 0) {
    return (
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 3 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {t('dash.recent.empty')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
      {jobs.map((job, index) => (
        <Stack
          key={job.id}
          component={NavLink}
          to="/nuevas"
          direction="row"
          spacing={1.625}
          alignItems="center"
          sx={{
            px: 2.125, py: 1.875, textDecoration: 'none', color: 'inherit',
            borderBottom: index === jobs.length - 1 ? 0 : 1,
            borderColor: 'divider',
            transition: 'background-color 140ms',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: 34, height: 34, flexShrink: 0, border: 1, borderColor: 'divider', borderRadius: 1,
              bgcolor: 'grey.300', color: 'text.secondary', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 13, fontWeight: 600,
            }}
          >
            {initialOf(job)}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={500} sx={{ fontSize: 12, mb: 0.75 }} noWrap>
              {job.title ?? job.role ?? jobSourceLabel(job.source)}
            </Typography>
            <Typography
              component="span"
              noWrap
              sx={{
                display: 'block', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 10, color: 'text.secondary',
              }}
            >
              {[job.company ?? job.author, job.location].filter(Boolean).join(' · ')}
            </Typography>
          </Box>

          <Typography variant="mono" color="text.secondary" sx={{ fontSize: '0.6875rem', minWidth: 62, textAlign: 'right' }}>
            {formatTime(job.foundAt)}
          </Typography>
          <IconArrowUpRight size={14} stroke={1.6} style={{ flexShrink: 0, opacity: 0.6 }} />
        </Stack>
      ))}
    </Box>
  );
};

export default RecentJobs;
