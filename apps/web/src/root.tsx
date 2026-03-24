import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Link,
  Navigate,
  Outlet,
} from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './components/login-page';
import { DashboardLayout } from './components/dashboard-layout';
import { TenantsListPage } from './components/tenants-list-page';
import { TenantCreationWizard } from './components/tenant-creation-wizard';
import { TenantConfigurationPage } from './components/tenant-configuration-page';
import { TenantViewPage } from './components/tenant-view-page';
import { TenantEditPage } from './components/tenant-edit-page';
import { ApiKeysListPage } from './components/api-keys-list-page';
import { useAuth } from './hooks/use-auth';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Loading component
function LoadingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#1976d2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }}
        />
        <p style={{ color: '#6b7280' }}>Cargando...</p>
      </div>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

// Root Layout Component (public routes only)
function PublicLayout() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Outlet />
    </div>
  );
}

// Index Page Component
function IndexPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '1rem',
          backgroundColor: '#1976d2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          fontSize: '2rem',
          marginBottom: '1.5rem',
        }}
      >
        F
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>
        Facturin
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', textAlign: 'center' }}>
        Sistema de Facturación Electrónica SUNAT
      </p>
      <nav>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '1rem' }}>
          <li>
            <Link
              to="/login"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#1976d2',
                color: 'white',
                borderRadius: '0.375rem',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Iniciar Sesión
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Login Page Wrapper
function LoginPageWrapper() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage />;
}

// Dashboard Page Component
function DashboardPage() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
        Dashboard
      </h1>
      <p style={{ color: '#6b7280' }}>Bienvenido al panel de administración de Facturin.</p>

      {/* Stats cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginTop: '2rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          }}
        >
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Tenants</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937' }}>0</p>
        </div>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          }}
        >
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Comprobantes
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937' }}>0</p>
        </div>
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          }}
        >
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            API Keys
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937' }}>0</p>
        </div>
      </div>
    </div>
  );
}

// Tenants Page Component
function TenantsPage() {
  return <TenantsListPage />;
}

// Tenant Creation Page Component
function TenantCreatePage() {
  return <TenantCreationWizard />;
}

// Tenant Configuration Page Component
function TenantConfigurePage() {
  return <TenantConfigurationPage />;
}

// Tenant View Page Component
function TenantViewPageComponent() {
  return <TenantViewPage />;
}

// Tenant Edit Page Component
function TenantEditPageComponent() {
  return <TenantEditPage />;
}

// API Keys Page Component
function ApiKeysPage() {
  return <ApiKeysListPage />;
}

// Settings Page Component
function SettingsPage() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
        Configuración
      </h1>
      <p style={{ color: '#6b7280' }}>Configura los ajustes del sistema.</p>
    </div>
  );
}

// 404 Not Found Page Component
function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '4rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>404</h1>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Página no encontrada</p>
      <Link
        to="/"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#1976d2',
          color: 'white',
          borderRadius: '0.375rem',
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        Volver al inicio
      </Link>
    </div>
  );
}

// Create the router with file-based routing structure
const router = createBrowserRouter([
  // Public routes
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
        element: <LoginPageWrapper />,
      },
    ],
  },
  // Protected routes with dashboard layout
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
        element: <TenantsPage />,
      },
      {
        path: 'tenants/new',
        element: <TenantCreatePage />,
      },
      {
        path: 'tenants/:id',
        element: <TenantViewPageComponent />,
      },
      {
        path: 'tenants/:id/edit',
        element: <TenantEditPageComponent />,
      },
      {
        path: 'tenants/:id/configure',
        element: <TenantConfigurePage />,
      },
      {
        path: 'api-keys',
        element: <ApiKeysPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  // 404 catch-all (outside of layout)
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

// Render the app
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>
  );
}
