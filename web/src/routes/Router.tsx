import { createBrowserRouter, Navigate } from 'react-router';
import OnboardingGate from '../views/onboarding/OnboardingGate';
import WelcomePage from '../views/onboarding/WelcomePage';
import DashboardPage from '../views/dashboard/DashboardPage';
import RejectedPage from '../views/dashboard/RejectedPage';
import RunPage from '../views/dashboard/RunPage';
import { INBOX_VIEWS } from '../views/jobs/inbox';
import FocusPage from '../views/focus/FocusPage';
import IntegrationsPage from '../views/integrations/IntegrationsPage';
import NewSourcePage from '../views/integrations/NewSourcePage';
import JobsPage from '../views/jobs/JobsPage';
import SettingsPage from '../views/settings/SettingsPage';

const router = createBrowserRouter([
  { path: '/bienvenida', element: <WelcomePage /> },
  {
    path: '/',
    element: <OnboardingGate />,
    children: [
      { index: true, element: <DashboardPage /> },
      ...INBOX_VIEWS.map((view) => ({ path: view.path.slice(1), element: <JobsPage /> })),
      { path: 'rechazadas', element: <RejectedPage /> },
      { path: 'busquedas/:id', element: <RunPage /> },
      { path: 'enfoque', element: <FocusPage /> },
      { path: 'integraciones', element: <IntegrationsPage /> },
      { path: 'integraciones/nueva', element: <NewSourcePage /> },
      { path: 'configuracion', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default router;
