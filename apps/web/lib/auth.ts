'use client';

import { login, register, getCurrentUser, type AuthResponse, type UserInfo } from './api/auth';

const TOKEN_KEY = 'qflow_auth_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    await getCurrentUser(token);
    return true;
  } catch {
    removeToken();
    return false;
  }
}

export async function loginUser(username: string, password: string): Promise<AuthResponse> {
  const response = await login({ username, password });
  setToken(response.access_token);
  return response;
}

export async function registerUser(username: string, password: string): Promise<AuthResponse> {
  const response = await register({ username, password });
  setToken(response.access_token);
  return response;
}

export function logoutUser(): void {
  removeToken();
}
