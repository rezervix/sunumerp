/**
 * API Configuration
 * Centralized configuration for API base URL and other settings.
 */

// In production (Electron build), we point to the remote central server.
// In development, you might still want to use localhost or the remote IP.
export const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://crm.cicekantechmedia.com'
  : (process.env.USE_REMOTE_API === 'true' ? 'https://crm.cicekantechmedia.com' : 'http://localhost:3000');

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
