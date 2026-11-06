const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export function getAuthToken(): string | null {
  // Use sessionStorage so closing the browser/application terminates the session
  const token = sessionStorage.getItem('brightcyber_token');
  if (token) return token;

  // Cleanup any old legacy tokens in localStorage if session was closed
  const sessionActive = sessionStorage.getItem('brightcyber_session_active');
  const legacyToken = localStorage.getItem('brightcyber_token');
  if (legacyToken) {
    if (sessionActive) {
      sessionStorage.setItem('brightcyber_token', legacyToken);
      localStorage.removeItem('brightcyber_token');
      return legacyToken;
    } else {
      localStorage.removeItem('brightcyber_token');
    }
  }
  return null;
}

export function setAuthToken(token: string | null): void {
  if (token) {
    sessionStorage.setItem('brightcyber_token', token);
    sessionStorage.setItem('brightcyber_session_active', '1');
    sessionStorage.setItem('brightcyber_last_activity', Date.now().toString());
    localStorage.removeItem('brightcyber_token');
  } else {
    sessionStorage.removeItem('brightcyber_token');
    sessionStorage.removeItem('brightcyber_session_active');
    sessionStorage.removeItem('brightcyber_last_activity');
    sessionStorage.removeItem('brightcyber_is_locked');
    localStorage.removeItem('brightcyber_token');
  }
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // If unauthorized, clear token and notify auth state
      setAuthToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage = data.error || data.message || `Request failed with status ${res.status}`;
      throw new ApiError(errorMessage, res.status);
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network communication error. Please verify connection.', 500);
  }
}

// API methods helper
export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
