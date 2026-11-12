import { t } from '../../i18n';
import { Box, Pagination, Typography } from '@mui/material';

interface AppPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
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
        {t('page.range', { first, last, total, noun })}
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
