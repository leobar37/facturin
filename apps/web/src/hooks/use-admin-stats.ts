import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AdminStats {
  tenants: {
    total: number;
    active: number;
    inactive: number;
  };
  apiKeys: {
    total: number;
    active: number;
  };
  comprobantes: {
    total: number;
    byEstado: Record<string, number>;
  };
  series: {
    total: number;
  };
}

async function fetchAdminStats(): Promise<AdminStats> {
  return api.get<AdminStats>('/api/admin/stats');
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats,
    staleTime: 1000 * 60, // 1 minute
  });
}
