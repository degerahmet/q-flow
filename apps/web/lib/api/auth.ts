import type { RegisterDto, LoginDto } from '@qflow/api-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
  };
}

export interface UserInfo {
  id: string;
  username: string;
  createdAt: string;
}

export async function register(data: RegisterDto): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Registration failed' }));
    throw new Error(error.message || `Registration failed: ${response.status}`);
  }

  return response.json();
}

export async function login(data: LoginDto): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || `Login failed: ${response.status}`);
  }

  return response.json();
}

export async function getCurrentUser(token: string): Promise<UserInfo> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get user info' }));
    throw new Error(error.message || `Failed to get user info: ${response.status}`);
  }

  return response.json();
}
