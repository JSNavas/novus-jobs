import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { getOnboarding } from '../../api/client';
import { setDisplayTimeZone } from '../../format';
import { setLanguage } from '../../i18n';
import FullLayout from '../../layouts/full/FullLayout';

const OnboardingGate = () => {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    getOnboarding()
      .then((state) => {
        setDisplayTimeZone(state.profile.geo.timezone);
        setLanguage(state.profile.language);
        setNeedsOnboarding(!state.completed);
      })
      .catch(() => setNeedsOnboarding(false));
  }, []);

  if (needsOnboarding === null) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  return needsOnboarding ? <Navigate to="/bienvenida" replace /> : <FullLayout />;
};

export default OnboardingGate;
