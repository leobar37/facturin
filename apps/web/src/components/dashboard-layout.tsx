import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useAuth } from '../hooks/use-auth';

// Navigation items configuration
const navigationItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Tenants',
    path: '/tenants',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: 'API Keys',
    path: '/api-keys',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
  },
  {
    label: 'Configuración',
    path: '/settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

// Mobile menu toggle component
function MobileMenuButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'none',
        padding: '0.5rem',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'white',
      }}
      className="mobile-menu-button"
      aria-label="Toggle menu"
    >
      {isOpen ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      )}
    </button>
  );
}

// Sidebar component
function Sidebar({
  isCollapsed,
  isMobileOpen,
  onMobileClose,
}: {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const location = useLocation();

  const navItems = navigationItems.map((item) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onMobileClose}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: isCollapsed ? '0.75rem' : '0.75rem 1rem',
          color: isActive ? '#1976d2' : '#6b7280',
          backgroundColor: isActive ? '#e3f2fd' : 'transparent',
          borderRadius: '0.375rem',
          textDecoration: 'none',
          fontWeight: isActive ? 500 : 400,
          transition: 'all 0.15s',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
      >
        {item.icon}
        {!isCollapsed && <span>{item.label}</span>}
      </Link>
    );
  });

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40,
          }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: isCollapsed ? '64px' : '240px',
          backgroundColor: 'white',
          borderRight: '1px solid #e5e7eb',
          padding: '1rem 0',
          transition: 'width 0.2s ease-in-out',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
        }}
        className="sidebar"
      >
        {/* Logo area */}
        <div
          style={{
            padding: isCollapsed ? '0.5rem' : '0 1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '0.5rem',
              backgroundColor: '#1976d2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '1rem',
            }}
          >
            F
          </div>
          {!isCollapsed && (
            <span
              style={{
                marginLeft: '0.75rem',
                fontWeight: 600,
                fontSize: '1.125rem',
                color: '#1f2937',
              }}
            >
              Facturin
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0 0.5rem' }}>{navItems}</nav>
      </aside>
    </>
  );
}

// Header component
function Header({
  onMenuToggle,
  isSidebarCollapsed,
}: {
  onMenuToggle: () => void;
  isSidebarCollapsed: boolean;
}) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: isSidebarCollapsed ? '64px' : '240px',
        right: 0,
        height: '64px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        transition: 'left 0.2s ease-in-out',
        zIndex: 30,
      }}
      className="header"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={onMenuToggle}
          style={{
            padding: '0.5rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            borderRadius: '0.375rem',
          }}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#1976d2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            {user?.email ? user.email[0].toUpperCase() : '?'}
          </div>
          <span style={{ color: '#374151', fontWeight: 500 }}>{user?.email}</span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.875rem',
            transition: 'background-color 0.15s',
          }}
        >
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}

// Main content area component
function MainContent({ isSidebarCollapsed }: { isSidebarCollapsed: boolean }) {
  return (
    <main
      style={{
        marginLeft: isSidebarCollapsed ? '64px' : '240px',
        marginTop: '64px',
        padding: '1.5rem',
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: '#f9fafb',
        transition: 'margin-left 0.2s ease-in-out',
      }}
      className="main-content"
    >
      <Outlet />
    </main>
  );
}

// Dashboard layout component
export function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Mobile menu button */}
      <MobileMenuButton isOpen={isMobileMenuOpen} onClick={toggleMobileMenu} />

      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={closeMobileMenu}
      />

      <Header onMenuToggle={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />

      <MainContent isSidebarCollapsed={isSidebarCollapsed} />

      {/* Responsive styles */}
      <style>
        {`
          @media (max-width: 768px) {
            .sidebar {
              transform: translateX(${isMobileMenuOpen ? '0' : '-100%'});
              transition: transform 0.2s ease-in-out;
            }
            .header {
              left: 0 !important;
            }
            .main-content {
              margin-left: 0 !important;
            }
            .mobile-menu-button {
              display: block !important;
            }
          }
          @media (min-width: 769px) {
            .mobile-overlay {
              display: none !important;
            }
          }
        `}
      </style>
    </div>
  );
}
