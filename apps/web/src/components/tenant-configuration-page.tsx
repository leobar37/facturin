import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { FormInput } from './ui/form-input';
import { useTenantById, useTenantReadiness } from '../hooks/use-tenants';
import { useUploadCertificate, useUpdateSunatCredentials } from '../hooks/use-create-tenant';
import { useSeries, useCreateSerie } from '../hooks/use-series';

const TIPO_COMPROBANTE_OPTIONS = [
  { value: '01', label: 'Factura' },
  { value: '03', label: 'Boleta' },
  { value: '07', label: 'Nota de Crédito' },
  { value: '08', label: 'Nota de Débito' },
];

function validateSunatUsername(username: string): { isValid: boolean; error?: string } {
  if (!username) {
    return { isValid: false, error: 'El usuario SOL es requerido' };
  }
  const usernameRegex = /^[A-Za-z0-9]{6,20}$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, error: 'El usuario SOL debe tener entre 6 y 20 caracteres alfanuméricos' };
  }
  return { isValid: true };
}

function validateSerieFormat(serie: string): { isValid: boolean; error?: string } {
  if (!serie) {
    return { isValid: false, error: 'La serie es requerida' };
  }
  if (!/^[A-Z0-9]{4}$/.test(serie.toUpperCase())) {
    return { isValid: false, error: 'La serie debe tener 4 caracteres alfanuméricos (ej: F001)' };
  }
  return { isValid: true };
}

// Certificate Section Component
function CertificateSection({ tenantId, hasCertificate }: { tenantId: string; hasCertificate?: boolean }) {
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadCertificate = useUploadCertificate();

  const handleFileChange = (file: File) => {
    setFileError(undefined);
    setSuccessMessage(null);

    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pfx' && extension !== 'p12') {
      setFileError('Solo se permiten archivos .pfx o .p12');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError('El archivo no debe superar los 10MB');
      return;
    }

    setCertificateFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
    });
  };

  const handleUpload = async () => {
    if (!certificateFile || !certificatePassword) {
      setErrorMessage('Selecciona un archivo e ingresa la contraseña');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const certificateBase64 = await convertFileToBase64(certificateFile);
      await uploadCertificate.mutateAsync({
        tenantId,
        certificate: certificateBase64,
        password: certificatePassword,
      });
      setSuccessMessage('Certificado actualizado exitosamente');
      setCertificateFile(null);
      setCertificatePassword('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error al subir certificado');
    }
  };

  const isLoading = uploadCertificate.isPending;

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        marginBottom: '1.5rem',
      }}
    >
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
        Certificado Digital
      </h3>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
        {hasCertificate
          ? 'Tienes un certificado configurado. Sube uno nuevo para reemplazarlo.'
          : 'Sube el certificado digital (.pfx o .p12) de tu empresa.'}
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#1976d2' : fileError ? '#dc2626' : '#d1d5db'}`,
          borderRadius: '0.5rem',
          padding: '1.5rem',
          textAlign: 'center',
          backgroundColor: dragActive ? '#eff6ff' : '#f9fafb',
          transition: 'all 0.2s',
          cursor: 'pointer',
          marginBottom: '1rem',
        }}
        onClick={() => document.getElementById('config-certificate-input')?.click()}
      >
        <input
          id="config-certificate-input"
          type="file"
          accept=".pfx,.p12"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileChange(file);
          }}
          style={{ display: 'none' }}
        />

        {certificateFile ? (
          <div>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              style={{ margin: '0 auto 0.5rem' }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p style={{ color: '#374151', fontWeight: 500 }}>{certificateFile.name}</p>
            <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
              {(certificateFile.size / 1024).toFixed(2)} KB
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCertificateFile(null);
              }}
              style={{
                marginTop: '0.5rem',
                padding: '0.25rem 0.5rem',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Eliminar
            </button>
          </div>
        ) : (
          <div>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              style={{ margin: '0 auto 0.5rem' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ color: '#374151', fontSize: '0.875rem' }}>
              Arrastra el archivo aquí o <span style={{ color: '#1976d2' }}>haz clic para seleccionar</span>
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Formatos: .pfx, .p12 (máximo 10MB)
            </p>
          </div>
        )}
      </div>

      {fileError && (
        <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{fileError}</p>
      )}

      <FormInput
        id="certPassword"
        name="certPassword"
        label="Contraseña del Certificado"
        type="password"
        placeholder="Contraseña del archivo .pfx"
        value={certificatePassword}
        onChange={(e) => setCertificatePassword(e.target.value)}
      />

      {successMessage && (
        <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {errorMessage}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={isLoading || !certificateFile || !certificatePassword}
        style={{
          padding: '0.625rem 1rem',
          backgroundColor: isLoading || !certificateFile || !certificatePassword ? '#93c5fd' : '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          fontWeight: 500,
          cursor: isLoading || !certificateFile || !certificatePassword ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
        }}
      >
        {isLoading ? 'Subiendo...' : 'Actualizar Certificado'}
      </button>
    </div>
  );
}

// SUNAT Credentials Section Component
function SunatCredentialsSection({
  tenantId,
  currentUsername,
}: {
  tenantId: string;
  currentUsername?: string;
}) {
  const [username, setUsername] = useState(currentUsername || '');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateSunatCredentials = useUpdateSunatCredentials();

  const usernameValidation = touched ? validateSunatUsername(username) : { isValid: true };

  const handleUpdate = async () => {
    setTouched(true);
    if (!usernameValidation.isValid || !password) {
      setErrorMessage('Completa todos los campos requeridos');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateSunatCredentials.mutateAsync({
        tenantId,
        username,
        password,
      });
      setSuccessMessage('Credenciales SUNAT actualizadas exitosamente');
      setPassword('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error al actualizar credenciales');
    }
  };

  const isLoading = updateSunatCredentials.isPending;

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        marginBottom: '1.5rem',
      }}
    >
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
        Credenciales SUNAT (SOL)
      </h3>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
        {currentUsername
          ? 'Actualiza tu usuario y contraseña SOL de SUNAT.'
          : 'Configura las credenciales de SUNAT para emitir comprobantes.'}
      </p>

      <FormInput
        id="sunatUsername"
        name="sunatUsername"
        label="Usuario SOL"
        type="text"
        placeholder="USUARIO"
        value={username}
        onChange={(e) => setUsername(e.target.value.toUpperCase())}
        onBlur={() => setTouched(true)}
        error={touched ? usernameValidation.error : undefined}
      />

      <FormInput
        id="sunatPassword"
        name="sunatPassword"
        label={currentUsername ? 'Nueva Contraseña SOL' : 'Contraseña SOL'}
        type="password"
        placeholder="Contraseña de SUNAT"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={!password && touched ? 'La contraseña es requerida' : undefined}
      />

      {successMessage && (
        <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {errorMessage}
        </div>
      )}

      <button
        onClick={handleUpdate}
        disabled={isLoading || !username || !password}
        style={{
          padding: '0.625rem 1rem',
          backgroundColor: isLoading || !username || !password ? '#93c5fd' : '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          fontWeight: 500,
          cursor: isLoading || !username || !password ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
        }}
      >
        {isLoading ? 'Guardando...' : 'Actualizar Credenciales'}
      </button>
    </div>
  );
}

// Series Management Section Component
function SeriesSection({ tenantId }: { tenantId: string }) {
  const [showModal, setShowModal] = useState(false);
  const [newSerie, setNewSerie] = useState({ tipoComprobante: '01', serie: '' });
  const [serieError, setSerieError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: series = [], isLoading } = useSeries(tenantId);
  const createSerie = useCreateSerie(tenantId);

  const handleCreateSerie = async () => {
    const validation = validateSerieFormat(newSerie.serie);
    if (!validation.isValid) {
      setSerieError(validation.error);
      return;
    }

    setSerieError(undefined);
    setSuccessMessage(null);

    try {
      await createSerie.mutateAsync({
        tipoComprobante: newSerie.tipoComprobante,
        serie: newSerie.serie.toUpperCase(),
      });
      setSuccessMessage('Serie creada exitosamente');
      setShowModal(false);
      setNewSerie({ tipoComprobante: '01', serie: '' });
    } catch (error) {
      setSerieError(error instanceof Error ? error.message : 'Error al crear serie');
    }
  };

  const getTipoLabel = (tipo: string) => {
    const found = TIPO_COMPROBANTE_OPTIONS.find((opt) => opt.value === tipo);
    return found ? found.label : tipo;
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        marginBottom: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>
            Series de Comprobantes
          </h3>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Gestiona las series para cada tipo de comprobante.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nueva Serie
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Cargando series...</div>
      ) : series.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          <p>No hay series configuradas.</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Agrega una serie para comenzar a emitir comprobantes.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#6b7280', fontWeight: 500, fontSize: '0.875rem' }}>
                  Tipo
                </th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#6b7280', fontWeight: 500, fontSize: '0.875rem' }}>
                  Serie
                </th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#6b7280', fontWeight: 500, fontSize: '0.875rem' }}>
                  Siguiente Número
                </th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#6b7280', fontWeight: 500, fontSize: '0.875rem' }}>
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {series.map((serie) => (
                <tr key={serie.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                    {getTipoLabel(serie.tipoComprobante)}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151', fontFamily: 'monospace' }}>
                    {serie.serie}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                    {String(serie.correlativoActual + 1).padStart(8, '0')}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: serie.isActive ? '#dcfce7' : '#fee2e2',
                        color: serie.isActive ? '#166534' : '#dc2626',
                      }}
                    >
                      {serie.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>
              Nueva Serie
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#333' }}>
                Tipo de Comprobante
              </label>
              <select
                value={newSerie.tipoComprobante}
                onChange={(e) => setNewSerie({ ...newSerie, tipoComprobante: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  backgroundColor: 'white',
                }}
              >
                {TIPO_COMPROBANTE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <FormInput
              id="newSerie"
              name="newSerie"
              label="Serie"
              type="text"
              placeholder="F001"
              value={newSerie.serie}
              onChange={(e) => {
                setNewSerie({ ...newSerie, serie: e.target.value.toUpperCase() });
                setSerieError(undefined);
              }}
              error={serieError}
              maxLength={4}
            />

            {successMessage && (
              <div style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {successMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '0.625rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSerie}
                disabled={createSerie.isPending || !newSerie.serie}
                style={{
                  padding: '0.625rem 1rem',
                  backgroundColor: createSerie.isPending || !newSerie.serie ? '#93c5fd' : '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: 500,
                  cursor: createSerie.isPending || !newSerie.serie ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                {createSerie.isPending ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Test Connection Button Component
function TestConnectionSection({ tenantId }: { tenantId: string }) {
  const { data: readiness, isLoading, error, refetch } = useTenantReadiness(tenantId);

  const handleTestConnection = async () => {
    await refetch();
  };

  const getResultMessage = () => {
    if (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error al probar conexión',
      };
    }
    if (readiness) {
      if (readiness.ready) {
        return {
          success: true,
          message: 'La conexión con SUNAT se realizó exitosamente. El tenant está configurado correctamente.',
        };
      } else {
        const missingLabels: Record<string, string> = {
          certificate: 'certificado digital',
          sunat_credentials: 'credenciales SUNAT',
          series: 'series de comprobantes',
        };
        const missingItems = readiness.missing.map((m) => missingLabels[m] || m);
        return {
          success: false,
          message: `El tenant no está listo. Faltan: ${missingItems.join(', ')}.`,
        };
      }
    }
    return null;
  };

  const result = getResultMessage();

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        marginBottom: '1.5rem',
      }}
    >
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
        Probar Conexión SUNAT
      </h3>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Verifica que las credenciales y certificado estén configurados correctamente.
      </p>

      <button
        onClick={handleTestConnection}
        disabled={isLoading}
        style={{
          padding: '0.625rem 1rem',
          backgroundColor: isLoading ? '#93c5fd' : '#059669',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          fontWeight: 500,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {isLoading ? (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            Probando...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Probar Conexión
          </>
        )}
      </button>

      {result && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor: result.success ? '#dcfce7' : '#fee2e2',
            color: result.success ? '#166534' : '#dc2626',
          }}
        >
          {result.message}
        </div>
      )}

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

// Main Tenant Configuration Page Component
export function TenantConfigurationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: tenant, isLoading, error } = useTenantById(id || null);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
        Cargando datos del tenant...
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>Error al cargar el tenant</h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          No se pudo encontrar el tenant especificado.
        </p>
        <button
          onClick={() => navigate('/tenants')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Volver a Tenants
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate('/tenants')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver a Tenants
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: '#1f2937',
                marginBottom: '0.25rem',
              }}
            >
              Configuración de {tenant.nombreComercial || tenant.razonSocial}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>RUC: {tenant.ruc}</p>
          </div>

          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 500,
              backgroundColor: tenant.isActive ? '#dcfce7' : '#fee2e2',
              color: tenant.isActive ? '#166534' : '#dc2626',
            }}
          >
            {tenant.isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      {/* Basic Info Card */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem',
        }}
      >
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>
          Información del Tenant
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Razón Social</p>
            <p style={{ color: '#374151', fontSize: '0.875rem' }}>{tenant.razonSocial}</p>
          </div>
          {tenant.nombreComercial && (
            <div>
              <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Nombre Comercial</p>
              <p style={{ color: '#374151', fontSize: '0.875rem' }}>{tenant.nombreComercial}</p>
            </div>
          )}
          <div>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>RUC</p>
            <p style={{ color: '#374151', fontSize: '0.875rem' }}>{tenant.ruc}</p>
          </div>
          {tenant.contactoEmail && (
            <div>
              <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Email</p>
              <p style={{ color: '#374151', fontSize: '0.875rem' }}>{tenant.contactoEmail}</p>
            </div>
          )}
          {tenant.contactoPhone && (
            <div>
              <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Teléfono</p>
              <p style={{ color: '#374151', fontSize: '0.875rem' }}>{tenant.contactoPhone}</p>
            </div>
          )}
          {tenant.direccion && (
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Dirección</p>
              <p style={{ color: '#374151', fontSize: '0.875rem' }}>
                {[tenant.direccion.direccion, tenant.direccion.distrito, tenant.direccion.provincia, tenant.direccion.departamento]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Certificate Section */}
      <CertificateSection tenantId={tenant.id} hasCertificate={tenant.hasCertificado} />

      {/* SUNAT Credentials Section */}
      <SunatCredentialsSection tenantId={tenant.id} />

      {/* Series Management Section */}
      <SeriesSection tenantId={tenant.id} />

      {/* Test Connection Section */}
      <TestConnectionSection tenantId={tenant.id} />
    </div>
  );
}
