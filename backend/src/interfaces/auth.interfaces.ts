// =============================================================================
// interfaces/auth.interfaces.ts — Contratos de la capa de autenticación
// =============================================================================

// Lo que el cliente envía para registrarse
export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

// Lo que el cliente envía para iniciar sesión
export interface LoginDto {
  email: string;
  password: string;
}

// La información del usuario que vive dentro del JWT (el "payload")
// Evitamos incluir la contraseña — nunca debe viajar en el token.
export interface JwtPayload {
  userId: string;
  email: string;
  familyGroupId: string | null;
}

// La respuesta que devuelve el servidor tras un login/register exitoso
export interface AuthResponse {
  token: string;          // JWT firmado
  user: {
    id: string;
    name: string;
    email: string;
    familyGroupId: string | null;
  };
}
