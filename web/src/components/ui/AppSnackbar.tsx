import { Alert, Snackbar } from '@mui/material';

interface AppSnackbarProps {
  message: string | null;
  severity: 'success' | 'error';
  onClose: () => void;
}

const AppSnackbar = ({ message, severity, onClose }: AppSnackbarProps) => (
  <Snackbar
    open={message !== null}
    autoHideDuration={5000}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
  >
    <Alert onClose={onClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
      {message}
    </Alert>
  </Snackbar>
);

export default AppSnackbar;
