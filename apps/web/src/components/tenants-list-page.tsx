import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useTenants } from '@/hooks/use-tenants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Plus, Search, Eye, Edit, Settings, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'default' : 'destructive'} className="gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
      {isActive ? 'Activo' : 'Inactivo'}
    </Badge>
  );
}

function ConfigBadge({ hasCertificado, hasSunatPassword }: { hasCertificado?: boolean; hasSunatPassword?: boolean }) {
  const isReady = hasCertificado && hasSunatPassword;
  return (
    <Badge variant={isReady ? 'default' : 'secondary'}>
      {isReady ? '✓ Configurado' : '⚠ Pendiente'}
    </Badge>
  );
}

function EmptyState({ hasSearch, onCreateTenant }: { hasSearch: boolean; onCreateTenant: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <Building2 className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {hasSearch ? 'No se encontraron tenants' : 'No hay tenants registrados'}
      </h3>
      <p className="text-gray-500 mb-6 max-w-sm">
        {hasSearch
          ? 'Intenta con otro término de búsqueda'
          : 'Comienza creando tu primer tenant para Facturin'}
      </p>
      {!hasSearch && (
        <Button onClick={onCreateTenant}>
          <Plus className="w-4 h-4 mr-2" />
          Crear Tenant
        </Button>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin mb-4" />
      <p className="text-gray-500">Cargando tenants...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar tenants</h3>
      <p className="text-gray-500 mb-6">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {getVisiblePages().map((page, index) =>
        page === '...' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>
        ) : (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'outline'}
            size="icon"
            onClick={() => onPageChange(page as number)}
          >
            {page}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ActionMenu({
  onView,
  onEdit,
  onConfigure,
}: {
  onView: () => void;
  onEdit: () => void;
  onConfigure: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg border shadow-lg min-w-[160px] py-1">
            <button
              onClick={() => { setIsOpen(false); onView(); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Eye className="h-4 w-4" />
              Ver
            </button>
            <button
              onClick={() => { setIsOpen(false); onEdit(); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Edit className="h-4 w-4" />
              Editar
            </button>
            <button
              onClick={() => { setIsOpen(false); onConfigure(); }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Settings className="h-4 w-4" />
              Configurar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function TenantsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error, refetch } = useTenants({
    search: debouncedSearch || undefined,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  const totalPages = data ? Math.ceil(data.pagination.total / pageSize) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tenants</h1>
          <p className="text-gray-500 text-sm">Gestiona los tenants registrados en el sistema</p>
        </div>
        <Button onClick={() => navigate('/tenants/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Tenant
        </Button>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por RUC, razón social o nombre comercial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Error desconocido'} onRetry={refetch} />
        ) : !data?.data.length ? (
          <EmptyState hasSearch={!!debouncedSearch} onCreateTenant={() => navigate('/tenants/new')} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">RUC</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Razón Social</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre Comercial</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Configuración</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((tenant) => (
                    <tr key={tenant.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900">{tenant.ruc}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{tenant.razonSocial}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{tenant.nombreComercial || '-'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge isActive={tenant.isActive} />
                      </td>
                      <td className="px-4 py-3">
                        <ConfigBadge
                          hasCertificado={tenant.hasCertificado}
                          hasSunatPassword={tenant.hasSunatPassword}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu
                          onView={() => navigate(`/tenants/${tenant.id}`)}
                          onEdit={() => navigate(`/tenants/${tenant.id}/edit`)}
                          onConfigure={() => navigate(`/tenants/${tenant.id}/configure`)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />

            <div className="px-4 py-3 border-t text-sm text-gray-500">
              Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, data.pagination.total)} de {data.pagination.total} tenants
            </div>
          </>
        )}
      </div>
    </div>
  );
}