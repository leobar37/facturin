import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTenantById } from '../hooks/use-tenants';
import { api } from '../lib/api';
import { Button } from './ui/button';
import { FormInput } from './ui/form-input';
import { Badge } from './ui/badge';
import { ArrowLeft, Save, Building2 } from 'lucide-react';

interface EditFormData {
  razonSocial: string;
  nombreComercial: string;
  contactoEmail: string;
  contactoPhone: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
}

function validateEmail(email: string): boolean {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function TenantEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tenant, isLoading, isError, error, refetch } = useTenantById(id || null);

  const [formData, setFormData] = useState<EditFormData>({
    razonSocial: '',
    nombreComercial: '',
    contactoEmail: '',
    contactoPhone: '',
    direccion: '',
    departamento: '',
    provincia: '',
    distrito: '',
    ubigeo: '',
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize form data when tenant loads
  useEffect(() => {
    if (tenant && !isInitialized) {
      setFormData({
        razonSocial: tenant.razonSocial || '',
        nombreComercial: tenant.nombreComercial || '',
        contactoEmail: tenant.contactoEmail || '',
        contactoPhone: tenant.contactoPhone || '',
        direccion: tenant.direccion?.direccion || '',
        departamento: tenant.direccion?.departamento || '',
        provincia: tenant.direccion?.provincia || '',
        distrito: tenant.direccion?.distrito || '',
        ubigeo: tenant.direccion?.ubigeo || '',
      });
      setIsInitialized(true);
    }
  }, [tenant, isInitialized]);

  const updateField = (field: keyof EditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const validateForm = (): boolean => {
    if (!formData.razonSocial.trim()) {
      setErrorMessage('La razón social es requerida');
      return false;
    }
    if (formData.contactoEmail && !validateEmail(formData.contactoEmail)) {
      setErrorMessage('El email no es válido');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      razonSocial: true,
      nombreComercial: true,
      contactoEmail: true,
      contactoPhone: true,
      direccion: true,
      departamento: true,
      provincia: true,
      distrito: true,
      ubigeo: true,
    });

    if (!validateForm()) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.put(`/api/admin/tenants/${id}`, {
        razonSocial: formData.razonSocial,
        nombreComercial: formData.nombreComercial || undefined,
        contactoEmail: formData.contactoEmail || undefined,
        contactoPhone: formData.contactoPhone || undefined,
        direccion: {
          direccion: formData.direccion || undefined,
          departamento: formData.departamento || undefined,
          provincia: formData.provincia || undefined,
          distrito: formData.distrito || undefined,
          ubigeo: formData.ubigeo || undefined,
        },
      });

      setSuccessMessage('Tenant actualizado exitosamente');
      setTimeout(() => {
        navigate(`/tenants/${id}`);
      }, 1500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al actualizar el tenant');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-gray-500">Cargando datos del tenant...</p>
        </div>
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar el tenant</h3>
          <p className="text-gray-500 mb-6">{error instanceof Error ? error.message : 'Error desconocido'}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/tenants/${id}`)}
          className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Editar Tenant</h1>
          <p className="text-gray-500 text-sm">
            {tenant.nombreComercial || tenant.razonSocial} - RUC: {tenant.ruc}
          </p>
        </div>
        <Badge variant={tenant.isActive ? 'default' : 'destructive'} className="ml-auto">
          {tenant.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errorMessage}
          </div>
        )}

        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-500" />
            Información General
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">RUC</p>
                <p className="font-medium text-gray-900">{tenant.ruc}</p>
              </div>
              <FormInput
                id="razonSocial"
                name="razonSocial"
                label="Razón Social *"
                type="text"
                placeholder="Empresa SAC"
                value={formData.razonSocial}
                onChange={(e) => updateField('razonSocial', e.target.value)}
                error={touched.razonSocial && !formData.razonSocial ? 'La razón social es requerida' : undefined}
              />
            </div>

            <FormInput
              id="nombreComercial"
              name="nombreComercial"
              label="Nombre Comercial"
              type="text"
              placeholder="Nombre de fantasía (opcional)"
              value={formData.nombreComercial}
              onChange={(e) => updateField('nombreComercial', e.target.value)}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              id="contactoEmail"
              name="contactoEmail"
              label="Email"
              type="email"
              placeholder="contacto@empresa.com"
              value={formData.contactoEmail}
              onChange={(e) => updateField('contactoEmail', e.target.value)}
              error={
                touched.contactoEmail && formData.contactoEmail && !validateEmail(formData.contactoEmail)
                  ? 'Email inválido'
                  : undefined
              }
            />
            <FormInput
              id="contactoPhone"
              name="contactoPhone"
              label="Teléfono"
              type="tel"
              placeholder="+51 999 999 999"
              value={formData.contactoPhone}
              onChange={(e) => updateField('contactoPhone', e.target.value)}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dirección</h2>
          <div className="space-y-4">
            <FormInput
              id="direccion"
              name="direccion"
              label="Dirección"
              type="text"
              placeholder="Av. Example 123"
              value={formData.direccion}
              onChange={(e) => updateField('direccion', e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                id="departamento"
                name="departamento"
                label="Departamento"
                type="text"
                placeholder="Lima"
                value={formData.departamento}
                onChange={(e) => updateField('departamento', e.target.value)}
              />
              <FormInput
                id="provincia"
                name="provincia"
                label="Provincia"
                type="text"
                placeholder="Lima"
                value={formData.provincia}
                onChange={(e) => updateField('provincia', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                id="distrito"
                name="distrito"
                label="Distrito"
                type="text"
                placeholder="Miraflores"
                value={formData.distrito}
                onChange={(e) => updateField('distrito', e.target.value)}
              />
              <FormInput
                id="ubigeo"
                name="ubigeo"
                label="Ubigeo"
                type="text"
                placeholder="150101"
                value={formData.ubigeo}
                onChange={(e) => updateField('ubigeo', e.target.value)}
                maxLength={6}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/tenants/${id}`)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
