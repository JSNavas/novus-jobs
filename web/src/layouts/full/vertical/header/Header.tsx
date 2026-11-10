import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
import { IconMenu2 } from '@tabler/icons-react';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => (
  <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
    <Toolbar>
      <IconButton aria-label="Abrir menú" onClick={onMenuClick} sx={{ mr: 1, display: { lg: 'none' } }}>
        <IconMenu2 size="20" />
      </IconButton>
      <Typography variant="h6" color="textSecondary">
        Ofertas de empleo
      </Typography>
    </Toolbar>
  </AppBar>
);

export default Header;
