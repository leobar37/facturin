/**
 * Test utilities for integration tests.
 * Provides helpers to skip tests gracefully when API/DB is unavailable.
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3100';
const API_HEALTH_URL = `${API_BASE}/api/health`;

export { API_BASE };

/**
 * Checks if the API server is reachable by calling the health endpoint.
 * Uses a short timeout to avoid long waits.
 */
export async function isApiServerAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const response = await fetch(API_HEALTH_URL, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Result type for safeFetch that indicates whether the request was skipped.
 */
export interface SafeFetchResult<T> {
  skipped: boolean;
  response?: Response;
  data?: T;
  error?: string;
}

/**
 * Wraps a fetch call to gracefully handle API unavailability.
 * Returns a result object that indicates if the test was skipped.
 *
 * Usage:
 * ```
 * const result = await safeFetch('/api/endpoint', options);
 * if (result.skipped) {
 *   return; // Test was skipped due to API unavailability
 * }
 * // Use result.response and result.data normally
 * ```
 */
export async function safeFetch<T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<SafeFetchResult<T>> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      // Add a timeout via signal if not already provided
      signal: options?.signal,
    });

    let data: T | undefined;
    try {
      data = await response.json() as T;
    } catch {
      // Response might be empty or not JSON
    }

    return {
      skipped: false,
      response,
      data,
    };
  } catch (err: unknown) {
    const error = err as { code?: string; errno?: number; message?: string };

    // Check if it's a connection error
    if (
      error.code === 'ConnectionRefused' ||
      error.errno === 0 ||
      error.message?.includes('ConnectionRefused') ||
      error.message?.includes('fetch failed')
    ) {
      return {
        skipped: true,
        error: 'API server is not available',
      };
    }

    // Re-throw other errors
    throw err;
  }
}

/**
 * Skips a test if the API server is not available.
 * Use this at the beginning of integration tests.
 *
 * Usage:
 * ```
 * it('should do something', async () => {
 *   if (await skipIfApiUnavailable()) return;
 *   // ... rest of test
 * });
 * ```
 *
 * @returns true if the test was skipped, false if API is available
 */
export async function skipIfApiUnavailable(): Promise<boolean> {
  const available = await isApiServerAvailable();
  if (!available) {
    console.log('⏭️  Skipping test: API server is not available');
    return true;
  }
  return false;
}
