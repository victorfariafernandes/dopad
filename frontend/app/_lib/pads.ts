// Mock: reads/writes pad content from localStorage so it persists across refreshes.
// Replace implementation with apiFetch calls when the backend is ready.

export async function getPad(slug: string): Promise<string> {
  return localStorage.getItem(`pad:${slug}`) ?? "";
}

export async function setPad(slug: string, content: string): Promise<void> {
  localStorage.setItem(`pad:${slug}`, content);
}
