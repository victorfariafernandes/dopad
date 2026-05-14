const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, init);
}
