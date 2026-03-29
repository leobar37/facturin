const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3102';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

interface RequestOptions extends RequestInit {
  token?: string | null;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token = getToken(), headers, ...rest } = options;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    // Handle both {message: "..."} and {error: "...", code: "..."} formats
    const errorMessage = errorData?.message || errorData?.error || `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export type { RequestOptions };
export { API_URL, getToken };