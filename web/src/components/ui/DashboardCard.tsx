import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

const DashboardCard = ({ title, subtitle, action, children }: DashboardCardProps) => (
  <Card elevation={0} variant="outlined">
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5">{title}</Typography>
          {subtitle ? (
            <Typography variant="subtitle2" color="textSecondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {action}
      </Stack>
      {children}
    </CardContent>
  </Card>
);

export default DashboardCard;
