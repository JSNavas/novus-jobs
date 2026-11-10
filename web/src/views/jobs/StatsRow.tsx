import { Box, Typography } from '@mui/material';
import { BlankCard } from '../../components/ui';
import { formatDateTime } from '../../format';
import type { RunInfo } from '../../types';
import type { Stats } from '../../api/client';

interface StatsRowProps {
  stats: Stats;
}

const lastRunText = (lastRun: RunInfo | null): string => {
  if (!lastRun) return 'Sin búsquedas todavía';
  return `${formatDateTime(lastRun.startedAt)} · ${lastRun.accepted} aceptadas`;
};

const StatsRow = ({ stats }: StatsRowProps) => {
  const tiles = [
    { label: 'Nuevas', value: String(stats.new) },
    { label: 'Guardadas', value: String(stats.saved) },
    { label: 'Total aceptadas', value: String(stats.total) },
    { label: 'Última búsqueda', value: lastRunText(stats.lastRun) },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
      {tiles.map((tile) => (
        <BlankCard key={tile.label}>
          <Box p={2.5}>
            <Typography variant="subtitle2" color="textSecondary">
              {tile.label}
            </Typography>
            <Typography variant="h5" mt={0.5}>
              {tile.value}
            </Typography>
          </Box>
        </BlankCard>
      ))}
    </Box>
  );
};

export default StatsRow;
