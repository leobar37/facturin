import { useParams, useNavigate } from 'react-router';
import { useTenantById } from '../hooks/use-tenants';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Building2, Mail, MapPin, Calendar, Edit, Settings } from 'lucide-react';

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin mb-4" />
      <p className="text-gray-500">Cargando datos del tenant...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar el tenant</h3>
      <p className="text-gray-500 mb-6">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

export function TenantViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tenant, isLoading, isError, error, refetch } = useTenantById(id || null);

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingState />
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="p-6">
        <ErrorState
          message={error instanceof Error ? error.message : 'Error desconocido'}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/tenants')}
            className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {tenant.nombreComercial || tenant.razonSocial}
            </h1>
            <p className="text-gray-500 text-sm">RUC: {tenant.ruc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={tenant.isActive ? 'default' : 'destructive'} className="gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${tenant.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
            {tenant.isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(`/tenants/${tenant.id}/edit`)}
        >
          <Edit className="w-4 h-4 mr-2" />
          Editar
        </Button>
        <Button
          onClick={() => navigate(`/tenants/${tenant.id}/configure`)}
        >
          <Settings className="w-4 h-4 mr-2" />
          Configurar
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-500" />
            Información General
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">RUC</dt>
              <dd className="font-medium text-gray-900">{tenant.ruc}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Razón Social</dt>
              <dd className="font-medium text-gray-900">{tenant.razonSocial}</dd>
            </div>
            {tenant.nombreComercial && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Nombre Comercial</dt>
                <dd className="font-medium text-gray-900">{tenant.nombreComercial}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Máx. Comprobantes/Mes</dt>
              <dd className="font-medium text-gray-900">
                {tenant.maxDocumentsPerMonth ?? 'Ilimitado'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-gray-500" />
            Información de Contacto
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{tenant.contactoEmail || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Teléfono</dt>
              <dd className="font-medium text-gray-900">{tenant.contactoPhone || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Address */}
        {tenant.direccion && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-500" />
              Dirección
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-gray-500 mb-1">Dirección</dt>
                <dd className="font-medium text-gray-900">
                  {tenant.direccion.direccion || 'No especificada'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Distrito</dt>
                <dd className="font-medium text-gray-900">
                  {tenant.direccion.distrito || '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Provincia</dt>
                <dd className="font-medium text-gray-900">
                  {tenant.direccion.provincia || '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Departamento</dt>
                <dd className="font-medium text-gray-900">
                  {tenant.direccion.departamento || '-'}
                </dd>
              </div>
              {tenant.direccion.ubigeo && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Ubigeo</dt>
                  <dd className="font-medium text-gray-900">{tenant.direccion.ubigeo}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* System Information */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            Información del Sistema
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Creado</dt>
              <dd className="font-medium text-gray-900">
                {new Date(tenant.createdAt).toLocaleDateString('es-PE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Última Actualización</dt>
              <dd className="font-medium text-gray-900">
                {new Date(tenant.updatedAt).toLocaleDateString('es-PE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Certificado</dt>
              <dd className="font-medium">
                <Badge variant={tenant.hasCertificado ? 'default' : 'secondary'}>
                  {tenant.hasCertificado ? '✓ Configurado' : '⚠ Pendiente'}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Credenciales SUNAT</dt>
              <dd className="font-medium">
                <Badge variant={tenant.hasSunatPassword ? 'default' : 'secondary'}>
                  {tenant.hasSunatPassword ? '✓ Configurado' : '⚠ Pendiente'}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
