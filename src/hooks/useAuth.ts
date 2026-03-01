import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// =============================================================================
// hooks/useAuth.ts — Hook de conveniencia para consumir el AuthContext
// =============================================================================
// En lugar de escribir `useContext(AuthContext)` en cada componente,
// creamos este hook reutilizable.
//
// Analogía: Como el helper `auth()` de Laravel — es un atajo al objeto Auth.
//
// Uso en cualquier componente:
//   const { user, isAuthenticated, logout } = useAuth();
// =============================================================================
export function useAuth() {
  return useContext(AuthContext);
}
