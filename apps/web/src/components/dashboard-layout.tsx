import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Building2, Key, Settings, Menu, X, LogOut } from 'lucide-react';

const navigationItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: 'Tenants',
    path: '/tenants',
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    label: 'API Keys',
    path: '/api-keys',
    icon: <Key className="w-5 h-5" />,
  },
  {
    label: 'Configuración',
    path: '/settings',
    icon: <Settings className="w-5 h-5" />,
  },
];

function MobileMenuButton({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
      aria-label="Toggle menu"
    >
      {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
    </button>
  );
}

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

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-50 bg-white border-r border-gray-200 flex flex-col
          transition-transform duration-200 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-60'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className={`flex items-center h-16 px-4 border-b border-gray-200 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            F
          </div>
          {!isCollapsed && <span className="font-semibold text-gray-900">Facturin</span>}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                  transition-colors
                  ${isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                {item.icon}
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

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
      className={`
        fixed top-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6
        transition-all duration-200 z-30
        ${isSidebarCollapsed ? 'lg:left-16' : 'lg:left-60'}
      `}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
            {user?.email ? user.email[0].toUpperCase() : '?'}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.email}</span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </Button>
      </div>
    </header>
  );
}

export function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileMenuButton isOpen={isMobileMenuOpen} onClick={toggleMobileMenu} />

      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={closeMobileMenu}
      />

      <Header onMenuToggle={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />

      <main
        className={`
          pt-16 min-h-screen transition-all duration-200
          ${isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'}
        `}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}