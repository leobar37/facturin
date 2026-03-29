import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3102';

export interface Serie {
  id: string;
  tenantId: string;
  tipoComprobante: string;
  serie: string;
  correlativoActual: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSerieInput {
  tipoComprobante: string;
  serie: string;
  correlativoActual?: number;
}

async function fetchSeries(token: string, tenantId: string): Promise<Serie[]> {
  const response = await fetch(`${API_URL}/api/v1/series`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error fetching series');
  }

  return response.json();
}

async function createSerie(token: string, tenantId: string, data: CreateSerieInput): Promise<Serie> {
  const response = await fetch(`${API_URL}/api/v1/series`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error creating serie');
  }

  return response.json();
}

export function useSeries(tenantId: string | null) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return useQuery({
    queryKey: ['series', tenantId],
    queryFn: () => {
      if (!token) throw new Error('Not authenticated');
      if (!tenantId) throw new Error('Tenant ID required');
      return fetchSeries(token, tenantId);
    },
    enabled: !!token && !!tenantId,
  });
}

export function useCreateSerie(tenantId: string) {
  const queryClient = useQueryClient();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return useMutation({
    mutationFn: (data: CreateSerieInput) => {
      if (!token) throw new Error('Not authenticated');
      return createSerie(token, tenantId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series', tenantId] });
    },
  });
}
