import { Box, Typography } from '@mui/material';
import { BlankCard } from '../../components/ui';
import { formatDateTime } from '../../format';
import type { RunInfo } from '../../types';
import type { Stats } from '../../api/client';

interface StatsRowProps {
  stats: Stats;
}

/**
 * La última búsqueda dice CUÁNTO LEYÓ, no cuántas aceptó.
 *
 * Decía "3 aceptadas" junto a un recuadro de "Total aceptadas: 2", y las dos
 * cifras eran ciertas: la pasada aceptó tres en su momento y después el
 * criterio cambió y una dejó de encajar. Pero en pantalla, una al lado de la
 * otra, solo parecían un error. Las publicaciones leídas son un hecho de la
 * pasada que no caduca; cuántas encajan es algo vivo y ya lo dice su propio
 * recuadro.
 */
const lastRunText = (lastRun: RunInfo | null): string => {
  if (!lastRun) return 'Sin búsquedas todavía';
  const read = lastRun.fetched === 1 ? '1 publicación leída' : `${lastRun.fetched} publicaciones leídas`;
  return `${formatDateTime(lastRun.startedAt)} · ${read}`;
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
