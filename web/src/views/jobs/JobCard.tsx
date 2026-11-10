import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { AppAlert, AppChip, BlankCard } from '../../components/ui';
import { formatDateTime } from '../../format';
import { jobLocationLabel, jobStatusLabel } from '../../labels';
import { JobLocation, JobStatus, type Job } from '../../types';

interface JobCardProps {
  job: Job;
  busy: boolean;
  onStatusChange: (status: JobStatus) => void;
}

const statusActions: { status: JobStatus; label: string; variant: 'contained' | 'outlined' | 'text' }[] = [
  { status: JobStatus.Saved, label: 'Guardar', variant: 'contained' },
  { status: JobStatus.Seen, label: 'Marcar como vista', variant: 'outlined' },
  { status: JobStatus.Dismissed, label: 'Descartar', variant: 'text' },
];

const locationText = (job: Job): string => {
  const hasReason = job.locationKind === JobLocation.OtherCountry || job.locationKind === JobLocation.Onsite;
  return hasReason ? (job.location ?? jobLocationLabel[job.locationKind]) : jobLocationLabel[job.locationKind];
};

const JobCard = ({ job, busy, onStatusChange }: JobCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const actions = statusActions.filter((action) => action.status !== job.status);

  return (
    <BlankCard>
      <Stack spacing={1.5} p={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} flexWrap="wrap">
          <Box>
            <Typography variant="h5">{job.title ?? 'Sin título'}</Typography>
            <Typography variant="subtitle2" color="textSecondary">
              {[job.company, formatDateTime(job.foundAt)].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {job.isUncertain ? <AppChip label="Por confirmar" tone="warning" /> : null}
            <AppChip label={jobStatusLabel[job.status]} />
          </Stack>
        </Stack>

        <Typography variant="body2">Publicado por {job.author ?? 'autor desconocido'}</Typography>
        {job.stackMatch.length > 0 ? (
          <Typography variant="body2">Coincide con: {job.stackMatch.join(', ')}</Typography>
        ) : null}
        <Typography variant="body2">Ubicación: {locationText(job)}</Typography>

        {job.applyUrl ? (
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Typography variant="body2">Postularse en: {job.applyUrl}</Typography>
            <Button variant="contained" component="a" href={job.applyUrl} target="_blank" rel="noopener noreferrer">
              Postularse
            </Button>
          </Stack>
        ) : job.contactEmail ? (
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Typography variant="body2">Enviar CV a: {job.contactEmail}</Typography>
            <Button variant="contained" component="a" href={`mailto:${job.contactEmail}`}>
              Enviar CV
            </Button>
          </Stack>
        ) : (
          <AppAlert severity="info">Sin enlace ni correo — hay que responder por LinkedIn</AppAlert>
        )}

        {job.isAggregator ? (
          <AppAlert severity="warning">VÍA AGREGADOR — no la publica quien contrata</AppAlert>
        ) : null}

        {job.url ? (
          <Button variant="outlined" component="a" href={job.url} target="_blank" rel="noopener noreferrer" sx={{ alignSelf: 'flex-start' }}>
            Ver publicación
          </Button>
        ) : null}

        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2,
            borderRadius: 1,
            bgcolor: 'grey.100',
            fontFamily: 'monospace',
            fontSize: 13,
            whiteSpace: 'pre-wrap',
            maxHeight: expanded ? 'none' : 140,
            overflow: 'hidden',
          }}
        >
          {job.text}
        </Box>
        <Button variant="text" onClick={() => setExpanded((value) => !value)} sx={{ alignSelf: 'flex-start' }}>
          {expanded ? 'ver menos' : 'ver más'}
        </Button>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          {actions.map((action) => (
            <Button
              key={action.status}
              variant={action.variant}
              disabled={busy}
              onClick={() => onStatusChange(action.status)}
            >
              {action.label}
            </Button>
          ))}
        </Stack>
      </Stack>
    </BlankCard>
  );
};

export default JobCard;
