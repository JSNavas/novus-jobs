import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import Breadcrumb, { type BreadcrumbItem } from './Breadcrumb';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: ReactNode;
  children: ReactNode;
}

const PageContainer = ({ title, subtitle, breadcrumbs, action, children }: PageContainerProps) => (
  <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} mb={3}>
      <Box>
        {breadcrumbs ? <Breadcrumb items={breadcrumbs} /> : null}
        <Typography variant="h4" mt={breadcrumbs ? 1 : 0}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="subtitle1" color="textSecondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Stack>
    {children}
  </Box>
);

export default PageContainer;
