import { useState } from 'react';
import { Box, Container } from '@mui/material';
import { Outlet } from 'react-router';
import { saveOnboardingStep } from '../../api/client';
import { language, setLanguage, type Language } from '../../i18n';
import { NotificationsProvider } from '../../notifications';
import AppFooter from './AppFooter';
import Header from './vertical/header/Header';
import Sidebar from './vertical/sidebar/Sidebar';

const FullLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang, setLang] = useState<Language>(language());

  const changeLanguage = (next: Language): void => {
    setLanguage(next);
    setLang(next);
    void saveOnboardingStep({ language: next }).catch(() => undefined);
  };

  return (
    <NotificationsProvider>
      <Box key={lang} sx={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Header onMenuClick={() => setMobileOpen(true)} onLanguageChange={changeLanguage} />
          <Container maxWidth={false} sx={{ maxWidth: 1600, px: { xs: 2, sm: 4 }, py: 3, flexGrow: 1 }}>
            <Outlet />
            <AppFooter />
          </Container>
        </Box>
      </Box>
    </NotificationsProvider>
  );
};

export default FullLayout;
