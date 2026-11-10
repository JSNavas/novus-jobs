import { createBrowserRouter, Navigate } from 'react-router';
import FullLayout from '../layouts/full/FullLayout';
import JobsPage from '../views/jobs/JobsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <FullLayout />,
    children: [
      { index: true, element: <JobsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default router;
