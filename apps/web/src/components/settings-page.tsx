import { useState, useEffect } from 'react';
import { useInstanceSettings, useUpdateInstanceSettings, type InstanceSettings } from '../hooks/use-instance-settings';
import { Button } from './ui/button';
import { FormInput } from './ui/form-input';
import { Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin mb-4" />
      <p className="text-gray-500">Cargando configuración...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar la configuración</h3>
      <p className="text-gray-500 mb-6">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

interface FormData {
  mode: string;
  isOseHomologated: boolean;
  oseResolutionNumber: string;
  oseHomologationDate: string;
  instanceName: string;
  instanceUrl: string;
  sunatBetaWsdlUrl: string;
  sunatProdWsdlUrl: string;
  sunatBetaRestUrl: string;
  sunatProdRestUrl: string;
}

function settingsToFormData(settings: InstanceSettings): FormData {
  return {
    mode: settings.mode || 'single',
    isOseHomologated: settings.isOseHomologated || false,
    oseResolutionNumber: settings.oseResolutionNumber || '',
    oseHomologationDate: settings.oseHomologationDate
      ? new Date(settings.oseHomologationDate).toISOString().split('T')[0]
      : '',
    instanceName: settings.instanceName || '',
    instanceUrl: settings.instanceUrl || '',
    sunatBetaWsdlUrl: settings.sunatBetaWsdlUrl || '',
    sunatProdWsdlUrl: settings.sunatProdWsdlUrl || '',
    sunatBetaRestUrl: settings.sunatBetaRestUrl || '',
    sunatProdRestUrl: settings.sunatProdRestUrl || '',
  };
}

export function SettingsPage() {
  const { data: settings, isLoading, isError, error, refetch } = useInstanceSettings();
  const updateSettings = useUpdateInstanceSettings();

  const [formData, setFormData] = useState<FormData>({
    mode: 'single',
    isOseHomologated: false,
    oseResolutionNumber: '',
    oseHomologationDate: '',
    instanceName: '',
    instanceUrl: '',
    sunatBetaWsdlUrl: '',
    sunatProdWsdlUrl: '',
    sunatBetaRestUrl: '',
    sunatProdRestUrl: '',
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form data when settings load
  useEffect(() => {
    if (settings && !isInitialized) {
      setFormData(settingsToFormData(settings));
      setIsInitialized(true);
    }
  }, [settings, isInitialized]);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateSettings.mutateAsync({
        mode: formData.mode || undefined,
        isOseHomologated: formData.isOseHomologated,
        oseResolutionNumber: formData.oseResolutionNumber || undefined,
        oseHomologationDate: formData.oseHomologationDate || undefined,
        instanceName: formData.instanceName || undefined,
        instanceUrl: formData.instanceUrl || undefined,
        sunatBetaWsdlUrl: formData.sunatBetaWsdlUrl || undefined,
        sunatProdWsdlUrl: formData.sunatProdWsdlUrl || undefined,
        sunatBetaRestUrl: formData.sunatBetaRestUrl || undefined,
        sunatProdRestUrl: formData.sunatProdRestUrl || undefined,
      });

      setSuccessMessage('Configuración guardada exitosamente');
      setHasChanges(false);
      refetch();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar la configuración');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingState />
      </div>
    );
  }

  if (isError || !settings) {
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configura los ajustes generales de la instancia
        </p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {errorMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            Configuración General
          </h2>

          <div className="space-y-4">
            <FormInput
              id="instanceName"
              name="instanceName"
              label="Nombre de la Instancia"
              type="text"
              placeholder="Facturin"
              value={formData.instanceName}
              onChange={(e) => updateField('instanceName', e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="mode"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Modo
                </label>
                <select
                  id="mode"
                  value={formData.mode}
                  onChange={(e) => updateField('mode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="single">Single Tenant</option>
                  <option value="multi">Multi Tenant</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isOseHomologated}
                    onChange={(e) => updateField('isOseHomologated', e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Homologado como OSE
                  </span>
                </label>
              </div>
            </div>

            <FormInput
              id="instanceUrl"
              name="instanceUrl"
              label="URL de la Instancia"
              type="url"
              placeholder="https://facturin.example.com"
              value={formData.instanceUrl}
              onChange={(e) => updateField('instanceUrl', e.target.value)}
            />
          </div>
        </div>

        {/* OSE Configuration */}
        {formData.isOseHomologated && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Configuración OSE
            </h2>

            <div className="space-y-4">
              <FormInput
                id="oseResolutionNumber"
                name="oseResolutionNumber"
                label="Número de Resolución"
                type="text"
                placeholder="123-2024"
                value={formData.oseResolutionNumber}
                onChange={(e) => updateField('oseResolutionNumber', e.target.value)}
              />

              <FormInput
                id="oseHomologationDate"
                name="oseHomologationDate"
                label="Fecha de Homologación"
                type="date"
                value={formData.oseHomologationDate}
                onChange={(e) => updateField('oseHomologationDate', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* SUNAT URLs */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            URLs de Servicios SUNAT
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                id="sunatBetaWsdlUrl"
                name="sunatBetaWsdlUrl"
                label="WSDL Beta"
                type="url"
                placeholder="https://e-beta.sunat.gob.pe/..."
                value={formData.sunatBetaWsdlUrl}
                onChange={(e) => updateField('sunatBetaWsdlUrl', e.target.value)}
              />

              <FormInput
                id="sunatProdWsdlUrl"
                name="sunatProdWsdlUrl"
                label="WSDL Producción"
                type="url"
                placeholder="https://e-factura.sunat.gob.pe/..."
                value={formData.sunatProdWsdlUrl}
                onChange={(e) => updateField('sunatProdWsdlUrl', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                id="sunatBetaRestUrl"
                name="sunatBetaRestUrl"
                label="REST Beta"
                type="url"
                placeholder="https://e-beta.sunat.gob.pe/..."
                value={formData.sunatBetaRestUrl}
                onChange={(e) => updateField('sunatBetaRestUrl', e.target.value)}
              />

              <FormInput
                id="sunatProdRestUrl"
                name="sunatProdRestUrl"
                label="REST Producción"
                type="url"
                placeholder="https://e-factura.sunat.gob.pe/..."
                value={formData.sunatProdRestUrl}
                onChange={(e) => updateField('sunatProdRestUrl', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-gray-50 rounded-lg border p-4 text-sm text-gray-500">
          <p>
            <strong>ID:</strong> {settings.id}
          </p>
          <p>
            <strong>Creado:</strong>{' '}
            {new Date(settings.createdAt).toLocaleString('es-PE')}
          </p>
          <p>
            <strong>Última actualización:</strong>{' '}
            {new Date(settings.updatedAt).toLocaleString('es-PE')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          {hasChanges && (
            <span className="text-sm text-amber-600">
              Tienes cambios sin guardar
            </span>
          )}
          <Button
            type="submit"
            disabled={updateSettings.isPending || !hasChanges}
          >
            {updateSettings.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
