const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}/api${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data ? String(data.error) : 'Could not complete request.';
    throw new Error(message);
  }
  return data as T;
}
export const get = <T,>(path: string) => api<T>(path);
export const post = <T,>(path: string, data?: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) });
export const patch = <T,>(path: string, data: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
