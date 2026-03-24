import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://localhost:3100';

export interface Tenant {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  direccion: {
    direccion?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    ubigeo?: string;
  } | null;
  contactoEmail: string | null;
  contactoPhone: string | null;
  isActive: boolean;
  maxDocumentsPerMonth: number | null;
  createdAt: string;
  updatedAt: string;
  hasCertificado?: boolean;
  hasSunatPassword?: boolean;
}

export interface TenantsResponse {
  data: Tenant[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface UseTenantsOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

async function fetchTenants(
  token: string,
  options: UseTenantsOptions = {}
): Promise<TenantsResponse> {
  const params = new URLSearchParams();
  if (options.search) params.set('search', options.search);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));

  const url = `${API_URL}/api/admin/tenants${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error fetching tenants');
  }

  return response.json();
}

async function fetchTenantById(token: string, id: string): Promise<Tenant> {
  const response = await fetch(`${API_URL}/api/admin/tenants/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error fetching tenant');
  }

  return response.json();
}

async function deactivateTenant(token: string, id: string): Promise<{ id: string; isActive: boolean }> {
  const response = await fetch(`${API_URL}/api/admin/tenants/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error deactivating tenant');
  }

  return response.json();
}

export function useTenants(options: UseTenantsOptions = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return useQuery({
    queryKey: ['tenants', options],
    queryFn: () => {
      if (!token) throw new Error('Not authenticated');
      return fetchTenants(token, options);
    },
    enabled: !!token,
  });
}

export function useTenantById(id: string | null) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => {
      if (!token) throw new Error('Not authenticated');
      if (!id) throw new Error('Tenant ID required');
      return fetchTenantById(token, id);
    },
    enabled: !!token && !!id,
  });
}

export function useDeactivateTenant() {
  const queryClient = useQueryClient();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error('Not authenticated');
      return deactivateTenant(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}
