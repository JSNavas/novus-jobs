import { useState } from 'react';
import { Box, Container } from '@mui/material';
import { Outlet } from 'react-router';
import Header from './vertical/header/Header';
import Sidebar from './vertical/sidebar/Sidebar';

const FullLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header onMenuClick={() => setMobileOpen(true)} />
        <Container maxWidth="lg" sx={{ py: 3, flexGrow: 1 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default FullLayout;
