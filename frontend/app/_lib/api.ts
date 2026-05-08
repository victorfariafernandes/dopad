const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const SESSION_KEY = "session_token";

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = sessionStorage.getItem(SESSION_KEY);
  const headers: HeadersInit = { ...(init?.headers as Record<string, string>) };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${API}${path}`, { ...init, headers });
}
