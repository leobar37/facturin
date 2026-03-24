import { useState, useEffect } from 'react';
import { useApiKeys, useCreateApiKey, useRevokeApiKey, type CreateApiKeyInput, type CreateApiKeyResponse } from '../hooks/use-api-keys';
import { FormInput } from './ui/form-input';

// Status badge component
function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: isActive ? '#dcfce7' : '#fee2e2',
        color: isActive ? '#166534' : '#991b1b',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isActive ? '#22c55e' : '#ef4444',
          marginRight: '0.5rem',
        }}
      />
      {isActive ? 'Activa' : 'Revocada'}
    </span>
  );
}

// Empty state component
function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
        >
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
      </div>
      <h3
        style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#374151',
          marginBottom: '0.5rem',
        }}
      >
        No hay API Keys registradas
      </h3>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Crea tu primera API Key para comenzar a integrar servicios externos
      </p>
    </div>
  );
}

// Loading state component
function LoadingState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e5e7eb',
          borderTopColor: '#1976d2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem',
        }}
      />
      <p style={{ color: '#6b7280' }}>Cargando API Keys...</p>
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

// Error state component
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3
        style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#374151',
          marginBottom: '0.5rem',
        }}
      >
        Error al cargar API Keys
      </h3>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{message}</p>
      <button
        onClick={onRetry}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Reintentar
      </button>
    </div>
  );
}

// Create API Key Modal
function CreateApiKeyModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (key: CreateApiKeyResponse) => void;
}) {
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const createApiKey = useCreateApiKey();

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setExpiresAt('');
      setError('');
      setCreatedKey(null);
      setCopied(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    try {
      const input: CreateApiKeyInput = {
        name: name.trim(),
        expiresAt: expiresAt || undefined,
      };
      const result = await createApiKey.mutateAsync(input);
      setCreatedKey(result);
      onSuccess(result);
    } catch {
      setError('Error al crear la API Key');
    }
  };

  const handleCopy = async () => {
    if (createdKey?.key) {
      await navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {createdKey ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                color: '#166534',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                API Key Creada
              </h2>
            </div>
            <div
              style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '0.375rem',
                padding: '1rem',
                marginBottom: '1rem',
              }}
            >
              <p
                style={{
                  color: '#92400e',
                  fontSize: '0.875rem',
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                ⚠️ Guarda esta clave ahora. No podrás verla nuevamente.
              </p>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  color: '#333',
                }}
              >
                Nombre
              </label>
              <p style={{ margin: 0, color: '#374151' }}>{createdKey.name}</p>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  color: '#333',
                }}
              >
                API Key
              </label>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                }}
              >
                <input
                  type="text"
                  readOnly
                  value={createdKey.key}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    backgroundColor: '#f9fafb',
                  }}
                />
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: copied ? '#22c55e' : '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: '1rem',
              }}
            >
              Crear Nueva API Key
            </h2>
            <form onSubmit={handleSubmit}>
              <FormInput
                id="name"
                name="name"
                type="text"
                label="Nombre de la API Key"
                placeholder="Ej: Producción API"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={error && !name.trim() ? 'El nombre es requerido' : ''}
              />
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="expiresAt"
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: 500,
                    color: '#333',
                  }}
                >
                  Fecha de Expiración (opcional)
                </label>
                <input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              {error && (
                <p
                  style={{
                    color: '#dc2626',
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                  }}
                >
                  {error}
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createApiKey.isPending}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: createApiKey.isPending ? '#9ca3af' : '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: 500,
                    cursor: createApiKey.isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {createApiKey.isPending ? 'Creando...' : 'Crear API Key'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// Revoke Confirmation Modal
function RevokeConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  apiKeyName,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  apiKeyName: string;
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          maxWidth: '400px',
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            color: '#991b1b',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Revocar API Key
          </h2>
        </div>
        <p style={{ color: '#374151', marginBottom: '1.5rem' }}>
          ¿Estás seguro de que deseas revocar la API Key <strong>"{apiKeyName}"</strong>? Esta acción no se puede deshacer.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isLoading ? '#9ca3af' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Revocando...' : 'Revocar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Action menu component
function ActionMenu({
  onRevoke,
  isActive,
}: {
  onRevoke: () => void;
  isActive: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isActive) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '0.5rem',
          backgroundColor: 'transparent',
          border: '1px solid #d1d5db',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          color: '#6b7280',
        }}
        aria-label="Acciones"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '0.25rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              zIndex: 50,
              minWidth: '160px',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => {
                setIsOpen(false);
                onRevoke();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#dc2626',
                fontSize: '0.875rem',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Revocar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Mask API key for display
function maskApiKey(keyPrefix: string): string {
  return `${keyPrefix}****************************`;
}

// Format date for display
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Nunca';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Main API Keys list page component
export function ApiKeysListPage() {
  const { data, isLoading, isError, error, refetch } = useApiKeys();
  const revokeApiKey = useRevokeApiKey();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeApiKey.mutateAsync(revokeTarget.id);
      setRevokeTarget(null);
    } catch {
      // Error handling - modal will stay open
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#1f2937',
              marginBottom: '0.25rem',
            }}
          >
            API Keys
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Gestiona las claves de API para acceder a los servicios
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nueva API Key
        </button>
      </div>

      {/* Table or states */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Error desconocido'}
            onRetry={refetch}
          />
        ) : !data?.length ? (
          <>
            <EmptyState />
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '0 0 1.5rem 0',
              }}
            >
              <button
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Crear Primera API Key
              </button>
            </div>
          </>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Nombre
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Key
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Permisos
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Expira
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Último Uso
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Estado
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'right',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((apiKey, index) => (
                  <tr
                    key={apiKey.id}
                    style={{
                      borderBottom: index < data.length - 1 ? '1px solid #e5e7eb' : 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td
                      style={{
                        padding: '1rem',
                        color: '#374151',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      }}
                    >
                      {apiKey.name}
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      {maskApiKey(apiKey.keyPrefix)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: '#e0e7ff',
                          color: '#3730a3',
                        }}
                      >
                        {apiKey.permissions.includes('*') ? 'Todas' : apiKey.permissions.join(', ')}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                      }}
                    >
                      {apiKey.expiresAt ? formatDate(apiKey.expiresAt) : 'Sin expiración'}
                    </td>
                    <td
                      style={{
                        padding: '1rem',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                      }}
                    >
                      {formatDate(apiKey.lastUsedAt)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <StatusBadge isActive={apiKey.isActive} />
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <ActionMenu
                        onRevoke={() => setRevokeTarget({ id: apiKey.id, name: apiKey.name })}
                        isActive={apiKey.isActive}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create API Key Modal */}
      <CreateApiKeyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Revoke Confirmation Modal */}
      <RevokeConfirmModal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        apiKeyName={revokeTarget?.name || ''}
        isLoading={revokeApiKey.isPending}
      />
    </div>
  );
}
