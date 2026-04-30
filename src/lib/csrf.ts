// Client-side CSRF helper — reads the alpha_csrf cookie and attaches it to fetch headers

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)alpha_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Secure fetch wrapper that automatically adds CSRF token and credentials
export async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const csrfToken = getCsrfToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (csrfToken) {
    headers.set('x-csrf-token', csrfToken);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send httpOnly cookies
  });
}
