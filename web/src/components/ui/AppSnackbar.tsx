import { Alert, Snackbar } from '@mui/material';
import { useEffect, useRef } from 'react';

interface AppSnackbarProps {
  message: string | null;
  severity: 'success' | 'error';
  onClose: () => void;
}

const AppSnackbar = ({ message, severity, onClose }: AppSnackbarProps) => {
  const shown = useRef<{ message: string; severity: 'success' | 'error' }>({ message: '', severity: 'success' });

  useEffect(() => {
    if (message !== null) shown.current = { message, severity };
  }, [message, severity]);

  const visible = message !== null ? { message, severity } : shown.current;

  return (
    <Snackbar
      open={message !== null}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={onClose} severity={visible.severity} variant="filled" sx={{ width: '100%' }}>
        {visible.message}
      </Alert>
    </Snackbar>
  );
};

export default AppSnackbar;
