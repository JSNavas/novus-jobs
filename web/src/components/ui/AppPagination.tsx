import { Box, Pagination, Typography } from '@mui/material';

/**
 * El paginador de todas las listas.
 *
 * DESAPARECE CON UNA SOLA PÁGINA. Un control que siempre dice "1" y no lleva a
 * ninguna parte es ruido que compite con lo que sí se puede pulsar, y en una
 * bandeja de tres ofertas ocupa tanto como una de ellas.
 *
 * Lleva escrito el tramo que se está viendo ("11-20 de 71") porque el número
 * de página solo, sin el total, no responde a la pregunta real: cuánto queda.
 */
interface AppPaginationProps {
  /** La página actual, contando desde 1. */
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  /** Cómo se llama lo que se lista, en plural: "ofertas", "búsquedas". */
  noun: string;
}

const AppPagination = ({ page, pageSize, total, onChange, noun }: AppPaginationProps) => {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      flexWrap="wrap"
      gap={1}
      py={2}
    >
      <Typography variant="body2" color="textSecondary">
        {first}-{last} de {total} {noun}
      </Typography>
      <Pagination
        page={page}
        count={pages}
        onChange={(_event, next) => onChange(next)}
        color="primary"
        shape="rounded"
        siblingCount={0}
      />
    </Box>
  );
};

export default AppPagination;
