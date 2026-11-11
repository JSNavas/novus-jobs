import { createBrowserRouter, Navigate } from 'react-router';
import FullLayout from '../layouts/full/FullLayout';
import DashboardPage from '../views/dashboard/DashboardPage';
import RejectedPage from '../views/dashboard/RejectedPage';
import RunPage from '../views/dashboard/RunPage';
import { INBOX_VIEWS } from '../views/jobs/inbox';
import FocusPage from '../views/focus/FocusPage';
import IntegrationsPage from '../views/integrations/IntegrationsPage';
import JobsPage from '../views/jobs/JobsPage';
import SettingsPage from '../views/settings/SettingsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <FullLayout />,
    children: [
      // La raíz es el dashboard: con el filtro haciendo su trabajo, la bandeja
      // de nuevas sale vacía casi siempre, y abrir en una pantalla vacía hace
      // parecer rota una aplicación que acaba de leer setenta publicaciones.
      { index: true, element: <DashboardPage /> },
      // Una ruta por estado de la bandeja; todas pintan la misma página, que
      // lee de la URL qué lista toca. Ver `views/jobs/inbox.ts`.
      ...INBOX_VIEWS.map((view) => ({ path: view.path.slice(1), element: <JobsPage /> })),
      { path: 'rechazadas', element: <RejectedPage /> },
      { path: 'busquedas/:id', element: <RunPage /> },
      { path: 'enfoque', element: <FocusPage /> },
      // Una sola página para la lista y para cada integración: lo que cambia
      // es cuántas tarjetas se pintan, y eso lo dice la URL.
      { path: 'integraciones', element: <IntegrationsPage /> },
      { path: 'integraciones/:name', element: <IntegrationsPage /> },
      { path: 'configuracion', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default router;
