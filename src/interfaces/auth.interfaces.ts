// =============================================================================
// interfaces/auth.interfaces.ts (Frontend)
// =============================================================================
// Espejo de los tipos de autenticación del backend.
// =============================================================================

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  familyGroupId: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
