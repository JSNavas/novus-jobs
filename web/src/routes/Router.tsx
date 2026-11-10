import { createBrowserRouter, Navigate } from 'react-router';
import FullLayout from '../layouts/full/FullLayout';
import { INBOX_VIEWS } from '../views/jobs/inbox';
import JobsPage from '../views/jobs/JobsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <FullLayout />,
    children: [
      // Una ruta por estado de la bandeja; todas pintan la misma página, que
      // lee de la URL qué lista toca. Ver `views/jobs/inbox.ts`.
      ...INBOX_VIEWS.map((view) =>
        view.path === '/'
          ? { index: true, element: <JobsPage /> }
          : { path: view.path.slice(1), element: <JobsPage /> }),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default router;
