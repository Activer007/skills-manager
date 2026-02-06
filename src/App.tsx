import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { PageLoader } from './components/ui/PageLoader';

// Lazy load pages for code splitting
const MySkills = lazy(() => import('./pages/MySkills'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const MarketplaceDataManagement = lazy(() => import('./pages/MarketplaceDataManagement'));
const Repositories = lazy(() => import('./pages/Repositories'));
const Settings = lazy(() => import('./pages/Settings'));
const Collections = lazy(() => import('./pages/Collections'));
const CollectionDetail = lazy(() => import('./pages/CollectionDetail'));
const ScanHistory = lazy(() => import('./pages/ScanHistory'));
const TaskCenter = lazy(() => import('./pages/TaskCenter'));
const SharePreview = lazy(() => import('./pages/SharePreview'));
const CreatorProfile = lazy(() => import('./pages/CreatorProfile'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DesignShowcase = lazy(() => import('./pages/DesignShowcase'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/marketplace" replace />,
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
        path: 'collections/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <CollectionDetail />
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
        path: 'marketplace/data-management',
        element: (
          <Suspense fallback={<PageLoader />}>
            <MarketplaceDataManagement />
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
        path: 'tasks',
        element: (
          <Suspense fallback={<PageLoader />}>
            <TaskCenter />
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
      {
        path: 'creator/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <CreatorProfile />
          </Suspense>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: 'design-showcase',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DesignShowcase />
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
    element: <Navigate to="/marketplace" replace />,
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
