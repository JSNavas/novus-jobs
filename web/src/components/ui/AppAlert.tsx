import { Alert } from '@mui/material';
import type { ReactNode } from 'react';

interface AppAlertProps {
  severity: 'success' | 'warning' | 'info' | 'error';
  children: ReactNode;
}

const AppAlert = ({ severity, children }: AppAlertProps) => (
  <Alert severity={severity} variant="outlined">
    {children}
  </Alert>
);

export default AppAlert;
