import { Alert, Snackbar } from '@mui/material';
import { useEffect, useRef } from 'react';

interface AppSnackbarProps {
  message: string | null;
  severity: 'success' | 'error';
  onClose: () => void;
}

/**
 * El aviso flotante.
 *
 * ═══ POR QUÉ RECUERDA LO QUE YA NO SE LE PASA ═══
 *
 * Un `Snackbar` no desaparece de golpe: sigue pintando su contenido mientras se
 * desvanece. Quien lo usa pone el mensaje a `null` al cerrar, así que durante
 * esa animación el componente recibe `message: null` y un `severity` que caía
 * por defecto a `'success'` — y el aviso ROJO de error se volvía VERDE justo al
 * irse. Parecía que, después de decirte que no se podía buscar, algo había
 * salido bien.
 *
 * Así que se guarda lo último que se enseñó y es lo que se pinta mientras dura
 * la salida. El contenido de un aviso no cambia porque lo estés cerrando.
 */
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
