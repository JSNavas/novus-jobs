import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box, CircularProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { getStats, listRuns, PAGE_SIZE, type Stats } from '../../api/client';
import { AppAlert, AppPagination, AppStatusPilot, BlankCard, PageContainer } from '../../components/ui';
import { formatDateTime } from '../../format';
import { RunStatus, type RunInfo } from '../../types';
import { runStatusLabel, runStatusTone } from './runStatus';

const POLL_INTERVAL_MS = 15_000;

/**
 * The page that was missing: what the searcher did and where each offer is.
 *
 * The first screen used to be the "Nuevas" inbox, and with the filter doing
 * its job that inbox is almost always empty. The result looked broken: zero
 * offers, zero information, and nothing explaining that behind it were seventy
 * postings read and discarded with their reason. Invisible work has to be shown,
 * because it is the only proof the system is alive when there is nothing to show.
 *
 * Every number here is clickable and leads to the offers behind it. A counter
 * that cannot be opened forces you to take it on trust, and what sits behind it
 * (what was discarded and why) is exactly what has to be auditable.
 */

interface Tile {
  label: string;
  value: number;
  hint: string;
  to: string;
  tone: 'success' | 'neutral';
  /** What the filter set aside unseen: shown muted with a dashed border. */
  audit?: boolean;
}

const tilesOf = (stats: Stats): Tile[] => [
  {
    label: 'Nuevas',
    value: stats.new,
    hint: 'Sin mirar todavía',
    to: '/nuevas',
    tone: 'success',
  },
  {
    label: 'Vistas',
    value: stats.byStatus.seen,
    hint: 'Leídas, sin decidir',
    to: '/vistas',
    tone: 'neutral',
  },
  {
    label: 'Guardadas',
    value: stats.byStatus.saved,
    hint: 'Para postularte',
    to: '/guardadas',
    tone: 'neutral',
  },
  {
    label: 'Descartadas por ti',
    value: stats.byStatus.dismissed,
    hint: 'Apartadas a mano',
    to: '/descartadas',
    tone: 'neutral',
  },
  {
    label: 'Descartadas por el filtro',
    value: stats.rejected,
    hint: 'No encajaban: mira el motivo',
    to: '/rechazadas',
    tone: 'neutral',
    audit: true,
  },
];

/** A failed search is visible at a glance: red band on the left and a tinted background. */
const failedRowSx = {
  bgcolor: 'error.light',
  '& > td:first-of-type': { borderLeft: 3, borderColor: 'error.main' },
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [runs, setRuns] = useState<RunInfo[] | null>(null);
  const [runsTotal, setRunsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = (): void => {
      Promise.all([getStats(), listRuns(PAGE_SIZE, (page - 1) * PAGE_SIZE)])
        .then(([nextStats, nextRuns]) => {
          if (cancelled) return;
          setStats(nextStats);
          setRuns(nextRuns.items);
          setRunsTotal(nextRuns.total);
          setError(null);
        })
        .catch((cause: unknown) => {
          if (!cancelled) setError(cause instanceof Error ? cause.message : 'Error desconocido');
        });
    };
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [page]);

  return (
    <PageContainer
      title="Dashboard"
      subtitle="Qué ha buscado, qué ha encontrado y dónde está cada oferta"
    >
      {error ? <AppAlert severity="error">{error}</AppAlert> : null}

      {!stats && !error ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : null}

      {stats ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          {tilesOf(stats).map((tile) => (
            <BlankCard key={tile.label} dashed={tile.audit}>
              <Box
                p={2.5}
                onClick={() => void navigate(tile.to)}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1 }}
              >
                <Typography variant="overline" component="div" color="textSecondary">{tile.label}</Typography>
                <Typography variant="metric" component="div" mt={1.5} color={tile.tone === 'success' && tile.value > 0 ? 'success.main' : 'textPrimary'}>
                  {tile.value}
                </Typography>
                <Typography variant="caption" component="div" color="textSecondary" mt={1}>{tile.hint}</Typography>
              </Box>
            </BlankCard>
          ))}
        </Box>
      ) : null}

      <Typography variant="h6" mb={1}>Búsquedas</Typography>
      <Typography variant="body2" color="textSecondary" mb={2}>
        Cada búsqueda, con lo que leyó y lo que hizo con ello. Pulsa una fila para ver sus ofertas.
      </Typography>

      <BlankCard>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Cuándo</TableCell>
              <TableCell align="right">Leídas</TableCell>
              <TableCell align="right">Encajaron</TableCell>
              <TableCell align="right">Descartadas</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs?.map((run) => (
              <TableRow
                key={run.id}
                hover
                onClick={() => void navigate(`/busquedas/${run.id}`)}
                sx={{ cursor: 'pointer', ...(run.status === RunStatus.Error ? failedRowSx : undefined) }}
              >
                <TableCell>
                  <Typography variant="mono" component="span">{formatDateTime(run.startedAt)}</Typography>
                </TableCell>
                <TableCell align="right">{run.fetched}</TableCell>
                <TableCell align="right">{run.accepted}</TableCell>
                <TableCell align="right">{run.rejected}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AppStatusPilot label={runStatusLabel(run)} tone={runStatusTone(run)} />
                    {/* Failure reason, truncated: the full detail lives on the search page. */}
                    {run.error ? (
                      <Typography variant="caption" color="textSecondary" noWrap sx={{ maxWidth: 320 }}>
                        {run.error}
                      </Typography>
                    ) : null}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {runs && runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="textSecondary" py={2} textAlign="center">
                    Todavía no se ha buscado ninguna vez.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </BlankCard>

      <AppPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={runsTotal}
        onChange={setPage}
        noun="búsquedas"
      />
    </PageContainer>
  );
};

export default DashboardPage;
