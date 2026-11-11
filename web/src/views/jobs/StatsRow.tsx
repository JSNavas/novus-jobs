import { Box, Typography } from '@mui/material';
import { BlankCard } from '../../components/ui';
import { formatDateTime } from '../../format';
import type { Stats } from '../../api/client';

interface StatsRowProps {
  stats: Stats;
}

const readText = (count: number): string => (count === 1 ? '1 publicación leída' : `${count} publicaciones leídas`);

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
const StatsRow = ({ stats }: StatsRowProps) => {
  const counters = [
    { label: 'Nuevas', value: stats.new, hint: 'Sin mirar todavía', positive: true },
    { label: 'Guardadas', value: stats.saved, hint: 'Para postularte', positive: false },
    // 'Para ti' y no 'aceptadas': las junior quedan fuera del recuento.
    { label: 'Total para ti', value: stats.total, hint: 'Sin las junior', positive: false },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
      {counters.map((counter) => (
        <BlankCard key={counter.label}>
          <Box p={2.5}>
            <Typography variant="overline" component="div" color="textSecondary">
              {counter.label}
            </Typography>
            <Typography
              variant="metric"
              component="div"
              mt={1.5}
              color={counter.positive && counter.value > 0 ? 'success.main' : 'textPrimary'}
            >
              {counter.value}
            </Typography>
            <Typography variant="caption" component="div" color="textSecondary" mt={1}>
              {counter.hint}
            </Typography>
          </Box>
        </BlankCard>
      ))}
      <BlankCard>
        <Box p={2.5}>
          <Typography variant="overline" component="div" color="textSecondary">
            Última búsqueda
          </Typography>
          {stats.lastRun ? (
            <>
              <Typography variant="mono" component="div" mt={1.5}>
                {formatDateTime(stats.lastRun.startedAt)}
              </Typography>
              <Typography variant="caption" component="div" color="textSecondary" mt={1}>
                {readText(stats.lastRun.fetched)}
              </Typography>
            </>
          ) : (
            <Typography variant="body1" component="div" color="textSecondary" mt={1.5}>
              Sin búsquedas todavía
            </Typography>
          )}
        </Box>
      </BlankCard>
    </Box>
  );
};

export default StatsRow;
