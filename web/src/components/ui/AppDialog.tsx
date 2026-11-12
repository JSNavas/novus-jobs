import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import type { ReactNode } from 'react';
import { t } from '../../i18n';

interface AppDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  confirmLabel?: string;
  onConfirm?: () => void;
}

const AppDialog = ({ open, title, children, onClose, confirmLabel, onConfirm }: AppDialogProps) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>{children}</DialogContent>
    <DialogActions>
      <Button variant="text" onClick={onClose}>
        {t('int.cancel')}
      </Button>
      {onConfirm && confirmLabel ? (
        <Button variant="contained" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      ) : null}
    </DialogActions>
  </Dialog>
);

export default AppDialog;
