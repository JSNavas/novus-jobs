import { t } from '../../../../i18n';
import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
import { IconMenu2 } from '@tabler/icons-react';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => (
  <AppBar
    position="sticky"
    elevation={0}
    sx={{ bgcolor: 'background.default', color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}
  >
    <Toolbar variant="dense">
      <IconButton aria-label={t('header.openMenu')} onClick={onMenuClick} sx={{ mr: 1, display: { sm: 'none' } }}>
        <IconMenu2 size="20" />
      </IconButton>
      <Typography variant="overline" color="textSecondary">
        {t('app.name')}
      </Typography>
    </Toolbar>
  </AppBar>
);

export default Header;
