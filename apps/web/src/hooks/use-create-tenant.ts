import { useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3102';

export interface CreateTenantInput {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: {
    direccion?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    ubigeo?: string;
  };
  contactoEmail?: string;
  contactoPhone?: string;
}

export interface UploadCertificateInput {
  tenantId: string;
  certificate: string; // base64 encoded
  password: string;
}

export interface UpdateSunatCredentialsInput {
  tenantId: string;
  username: string;
  password: string;
}

async function createTenant(token: string, data: CreateTenantInput) {
  const response = await fetch(`${API_URL}/api/admin/tenants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error creating tenant');
  }

  return response.json();
}

async function uploadCertificate(token: string, data: UploadCertificateInput) {
  const response = await fetch(`${API_URL}/api/admin/tenants/${data.tenantId}/certificate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      certificate: data.certificate,
      password: data.password,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error uploading certificate');
  }

  return response.json();
}

async function updateSunatCredentials(token: string, data: UpdateSunatCredentialsInput) {
  const response = await fetch(`${API_URL}/api/admin/tenants/${data.tenantId}/sunat-credentials`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: data.username,
      password: data.password,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error updating SUNAT credentials');
  }

  return response.json();
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return useMutation({
    mutationFn: (data: CreateTenantInput) => {
      if (!token) throw new Error('Not authenticated');
      return createTenant(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useUploadCertificate() {
  const queryClient = useQueryClient();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return useMutation({
    mutationFn: (data: UploadCertificateInput) => {
      if (!token) throw new Error('Not authenticated');
      return uploadCertificate(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useUpdateSunatCredentials() {
  const queryClient = useQueryClient();
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  return useMutation({
    mutationFn: (data: UpdateSunatCredentialsInput) => {
      if (!token) throw new Error('Not authenticated');
      return updateSunatCredentials(token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}
