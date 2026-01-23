import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { PageLoader } from './components/ui/PageLoader';

// Lazy load pages for code splitting
const MySkills = lazy(() => import('./pages/MySkills'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Repositories = lazy(() => import('./pages/Repositories'));
const Settings = lazy(() => import('./pages/Settings'));
const Collections = lazy(() => import('./pages/Collections'));
const ScanHistory = lazy(() => import('./pages/ScanHistory'));
const SharePreview = lazy(() => import('./pages/SharePreview'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/my-skills" replace />,
      },
      {
        path: 'my-skills',
        element: (
          <Suspense fallback={<PageLoader />}>
            <MySkills />
          </Suspense>
        ),
      },
      {
        path: 'collections',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Collections />
          </Suspense>
        ),
      },
      {
        path: 'marketplace',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Marketplace />
          </Suspense>
        ),
      },
      {
        path: 'repositories',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Repositories />
          </Suspense>
        ),
      },
      {
        path: 'security',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ScanHistory />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Settings />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: 'share/:shareId',
    element: (
      <Suspense fallback={<PageLoader />}>
        <SharePreview />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/my-skills" replace />,
  }
]);

function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
