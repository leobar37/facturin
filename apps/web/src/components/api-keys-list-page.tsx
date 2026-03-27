import { useState } from 'react';
import { useApiKeys, useCreateApiKey, useRevokeApiKey, type CreateApiKeyInput, type CreateApiKeyResponse } from '@/hooks/use-api-keys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Key, Plus, Copy, Check, AlertTriangle } from 'lucide-react';

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'default' : 'destructive'} className="gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
      {isActive ? 'Activa' : 'Revocada'}
    </Badge>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
        <Key className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay API Keys registradas</h3>
      <p className="text-gray-500 mb-6 max-w-sm">
        Crea tu primera API Key para comenzar a integrar servicios externos
      </p>
      <Button onClick={onCreate}>
        <Plus className="w-4 h-4 mr-2" />
        Crear Primera API Key
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin mb-4" />
      <p className="text-gray-500">Cargando API Keys...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar API Keys</h3>
      <p className="text-gray-500 mb-6">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

function maskApiKey(key: string): string {
  return `${key}****`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface CreateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateApiKeyModal({ isOpen, onClose }: CreateApiKeyModalProps) {
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const createApiKey = useCreateApiKey();

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

  const handleClose = () => {
    setName('');
    setExpiresAt('');
    setError('');
    setCreatedKey(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {createdKey ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <Check className="w-5 h-5" />
                <DialogTitle>API Key Creada</DialogTitle>
              </div>
            </DialogHeader>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
              <p className="text-amber-800 text-sm font-medium">
                ⚠️ Guarda esta clave ahora. No podrás verla nuevamente.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Nombre</Label>
                <p className="text-gray-900">{createdKey.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">API Key</Label>
                <div className="flex gap-2">
                  <Input value={createdKey.key} readOnly className="font-mono text-sm" />
                  <Button onClick={handleCopy} variant="outline" size="icon">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Crear Nueva API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la API Key</Label>
                <Input
                  id="name"
                  placeholder="Ej: Producción API"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Fecha de Expiración (opcional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={createApiKey.isPending}>
                {createApiKey.isPending ? 'Creando...' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface RevokeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  apiKeyName: string;
  isLoading: boolean;
}

function RevokeConfirmModal({ isOpen, onClose, onConfirm, apiKeyName, isLoading }: RevokeConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Revocar API Key
          </DialogTitle>
        </DialogHeader>
        <p className="text-gray-600">
          ¿Estás seguro de que deseas revocar la API Key <strong>"{apiKeyName}"</strong>? Esta acción no se puede deshacer.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Revocando...' : 'Revocar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ApiKeysListPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, isError, error, refetch } = useApiKeys();
  const revokeApiKey = useRevokeApiKey();

  const handleRevoke = async () => {
    if (revokeTarget) {
      await revokeApiKey.mutateAsync(revokeTarget.id);
      setRevokeTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">API Keys</h1>
          <p className="text-gray-500 text-sm">Gestiona las claves de acceso a la API</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva API Key
        </Button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message={error instanceof Error ? error.message : 'Error desconocido'} onRetry={refetch} />
        ) : !data?.length ? (
          <EmptyState onCreate={() => setIsCreateModalOpen(true)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Key</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Permisos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expira</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Último Uso</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((apiKey) => (
                  <tr key={apiKey.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{apiKey.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{maskApiKey(apiKey.keyPrefix)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {apiKey.permissions.includes('*') ? 'Todas' : apiKey.permissions.join(', ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {apiKey.expiresAt ? formatDate(apiKey.expiresAt) : 'Sin expiración'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(apiKey.lastUsedAt)}</td>
                    <td className="px-4 py-3"><StatusBadge isActive={apiKey.isActive} /></td>
                    <td className="px-4 py-3 text-right">
                      {apiKey.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setRevokeTarget({ id: apiKey.id, name: apiKey.name })}
                        >
                          Revocar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateApiKeyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

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