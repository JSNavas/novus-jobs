import { Box, Typography } from '@mui/material';
import { BlankCard } from '../../components/ui';
import { formatDateTime } from '../../format';
import { plural, t } from '../../i18n';
import type { Stats } from '../../api/client';

interface StatsRowProps {
  stats: Stats;
}

const readText = (count: number): string => plural(count, 'stats.read.one', 'stats.read.many');

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
    { label: t('stats.new'), value: stats.new, hint: t('stats.new.hint'), positive: true },
    { label: t('stats.saved'), value: stats.saved, hint: t('stats.saved.hint'), positive: false },
    // 'Para ti' y no 'aceptadas': las junior quedan fuera del recuento. Sin
    // pie: el nombre ya lo dice, y la aclaración solo nombraba lo que falta.
    { label: t('stats.total'), value: stats.total, hint: null, positive: false },
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
            {counter.hint ? (
              <Typography variant="caption" component="div" color="textSecondary" mt={1}>
                {counter.hint}
              </Typography>
            ) : null}
          </Box>
        </BlankCard>
      ))}
      <BlankCard>
        <Box p={2.5}>
          <Typography variant="overline" component="div" color="textSecondary">
            {t('stats.lastRun')}
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
              {t('stats.noRuns')}
            </Typography>
          )}
        </Box>
      </BlankCard>
    </Box>
  );
};

export default StatsRow;
