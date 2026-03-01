import type { AuthResponse } from '../interfaces/auth.interfaces';

// =============================================================================
// services/authService.ts (Frontend)
// =============================================================================
// Capa de comunicación con el backend de autenticación.
// Analogía Laravel: Como un API Client que llama a endpoints externos.
// =============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:3001`;

export interface LoginCredentials {
  email: string;
  password: string;
}

// Re-exportamos el tipo de respuesta para que el contexto lo use
export type { AuthResponse };

// POST /api/auth/login
export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  // Si el servidor devuelve un error (401, 400, etc.), parseamos el mensaje
  if (!response.ok) {
    const error = await response.json() as { error: string };
    // Lanzamos el mensaje de error del servidor para mostrarlo en el UI
    throw new Error(error.error ?? 'Error al iniciar sesión');
  }

  return response.json() as Promise<AuthResponse>;
}
