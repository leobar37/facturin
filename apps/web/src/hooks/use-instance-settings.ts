import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface InstanceSettings {
  id: string;
  mode: string;
  isOseHomologated: boolean;
  oseResolutionNumber: string | null;
  oseHomologationDate: string | null;
  instanceName: string;
  instanceUrl: string | null;
  sunatBetaWsdlUrl: string | null;
  sunatProdWsdlUrl: string | null;
  sunatBetaRestUrl: string | null;
  sunatProdRestUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateInstanceSettingsInput {
  mode?: string;
  isOseHomologated?: boolean;
  oseResolutionNumber?: string;
  oseHomologationDate?: string;
  instanceName?: string;
  instanceUrl?: string;
  sunatBetaWsdlUrl?: string;
  sunatProdWsdlUrl?: string;
  sunatBetaRestUrl?: string;
  sunatProdRestUrl?: string;
}

async function fetchInstanceSettings(): Promise<InstanceSettings> {
  return api.get<InstanceSettings>('/api/admin/settings');
}

async function updateInstanceSettings(data: UpdateInstanceSettingsInput): Promise<InstanceSettings> {
  return api.put<InstanceSettings>('/api/admin/settings', data);
}

export function useInstanceSettings() {
  return useQuery({
    queryKey: ['instance-settings'],
    queryFn: fetchInstanceSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateInstanceSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateInstanceSettingsInput) => updateInstanceSettings(data),
    onSuccess: (newData) => {
      queryClient.setQueryData(['instance-settings'], newData);
    },
  });
}
