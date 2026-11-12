import { Alert } from '@mui/material';
import type { ReactNode } from 'react';

interface AppAlertProps {
  severity: 'success' | 'warning' | 'info' | 'error';
  onClose?: () => void;
  children: ReactNode;
}

const AppAlert = ({ severity, onClose, children }: AppAlertProps) => (
  <Alert severity={severity} variant="outlined" onClose={onClose}>
    {children}
  </Alert>
);

export default AppAlert;
