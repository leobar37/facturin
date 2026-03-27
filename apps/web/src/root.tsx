import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createBrowserRouter } from 'react-router';
import './styles/globals.css';

import { PublicLayout } from './components/public-layout';
import { IndexPage } from './components/index-page';
import { LoginPage } from './components/login-page';
import { ProtectedRoute } from './components/protected-route';
import { DashboardLayout } from './components/dashboard-layout';
import { DashboardPage } from './components/dashboard-page';
import { TenantsListPage } from './components/tenants-list-page';
import { TenantCreationWizard } from './components/tenant-creation-wizard';
import { TenantViewPage } from './components/tenant-view-page';
import { TenantEditPage } from './components/tenant-edit-page';
import { TenantConfigurationPage } from './components/tenant-configuration-page';
import { ApiKeysListPage } from './components/api-keys-list-page';
import { SettingsPage } from './components/settings-page';
import { NotFoundPage } from './components/not-found-page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <IndexPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'tenants',
        element: <TenantsListPage />,
      },
      {
        path: 'tenants/new',
        element: <TenantCreationWizard />,
      },
      {
        path: 'tenants/:id',
        element: <TenantViewPage />,
      },
      {
        path: 'tenants/:id/edit',
        element: <TenantEditPage />,
      },
      {
        path: 'tenants/:id/configure',
        element: <TenantConfigurationPage />,
      },
      {
        path: 'api-keys',
        element: <ApiKeysListPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  );
}