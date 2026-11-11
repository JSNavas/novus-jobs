import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { getOnboarding } from '../../api/client';
import FullLayout from '../../layouts/full/FullLayout';

/**
 * LA PUERTA. Mientras el alta no esté hecha, la aplicación manda a la
 * bienvenida.
 *
 * Es una redirección y no un aviso dentro del dashboard porque sin perfil no
 * hay nada que enseñar: el filtro descartaría cuanto llegue y el servidor ni
 * siquiera lanza búsquedas. Un dashboard con ceros y un cartel sería peor que
 * la pantalla que pide los datos.
 *
 * Si la pregunta falla —servidor caído, API a medias— se deja pasar en vez de
 * bloquear: una instalación ya en marcha no puede quedarse fuera de su propio
 * dashboard porque una petición se cayó.
 */
const OnboardingGate = () => {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    getOnboarding()
      .then((state) => setNeedsOnboarding(!state.completed))
      .catch(() => setNeedsOnboarding(false));
  }, []);

  if (needsOnboarding === null) {
    return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;
  }
  return needsOnboarding ? <Navigate to="/bienvenida" replace /> : <FullLayout />;
};

export default OnboardingGate;
