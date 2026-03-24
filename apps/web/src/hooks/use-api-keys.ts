import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = 'http://localhost:3001';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreateApiKeyInput {
  name: string;
  permissions?: string[];
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  permissions: string[];
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

async function fetchApiKeys(token: string): Promise<ApiKey[]> {
  const response = await fetch(`${API_URL}/api/admin/api-keys`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error fetching API keys');
  }

  return response.json();
}

async function createApiKey(
  token: string,
  input: CreateApiKeyInput
): Promise<CreateApiKeyResponse> {
  const response = await fetch(`${API_URL}/api/admin/api-keys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Error creating API key');
  }

  return response.json();
}

async function revokeApiKey(
  token: string,
  id: string
): Promise<{ id: string; isActive: boolean }> {
  const response = await fetch(`${API_URL}/api/admin/api-keys/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error revoking API key');
  }

  return response.json();
}

export function useApiKeys() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () => {
      if (!token) throw new Error('Not authenticated');
      return fetchApiKeys(token);
    },
    enabled: !!token,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return useMutation({
    mutationFn: (input: CreateApiKeyInput) => {
      if (!token) throw new Error('Not authenticated');
      return createApiKey(token, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error('Not authenticated');
      return revokeApiKey(token, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}
