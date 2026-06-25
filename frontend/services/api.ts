const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://executeai.onrender.com';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

class ApiService {
  private getHeaders(authRequired: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authRequired) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          // Dispatch custom event to let auth context know the token expired
          window.dispatchEvent(new Event('auth_expired'));
        }
        throw new AuthError(errorMessage, response.status);
      }

      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  public async get<T>(path: string, authRequired: boolean = true): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: this.getHeaders(authRequired),
    });
    return this.handleResponse<T>(response);
  }

  public async post<T>(path: string, body: any, authRequired: boolean = true): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(authRequired),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  public async put<T>(path: string, body: any, authRequired: boolean = true): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(authRequired),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }
}

export const api = new ApiService();
