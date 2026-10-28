/**
 * API Configuration
 * Centralized configuration for API base URL and other settings.
 */

// In client-side browser, always use relative URLs ('') so it works seamlessly on any domain/demo.
// On server-side, fallback to VERCEL_URL or localhost.
export const BASE_URL = typeof window !== 'undefined'
  ? ''
  : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const API_BASE = `${BASE_URL}/api`;

/**
 * Helper to handle fetch responses and ensure they are JSON
 */
export async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  if (!res.ok) {
    if (isJson) {
      const errorData = await res.json();
      throw new Error(errorData.error || `Request failed with status ${res.status}`);
    }
    const text = await res.text();
    console.error("Non-JSON error response:", text.substring(0, 200));
    throw new Error(`Server error: ${res.status} ${res.statusText}`);
  }

  if (!isJson) {
    const text = await res.text();
    console.error("Expected JSON but got:", text.substring(0, 200));
    throw new Error("Invalid response format from server (expected JSON)");
  }

  return await res.json() as T;
}
