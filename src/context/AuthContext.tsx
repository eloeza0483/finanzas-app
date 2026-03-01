import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '../interfaces/auth.interfaces';

// =============================================================================
// context/AuthContext.tsx — Estado global de autenticación
// =============================================================================
// Analogía Laravel: Como la fachada `Auth::` de Laravel — disponible en toda
// la app. En React lo logramos con el patrón Context + Provider.
//
// ¿Por qué Context y no solo useState en App.tsx?
// → Si el usuario estuviera solo en App.tsx, para pasarlo a CalendarGrid
//   necesitaríamos pasarlo como prop → y si CalendarGrid tiene hijos → más props.
//   Esto se llama "prop drilling" y es un antipatrón.
// → Context = poner el usuario en un "cajón global" que cualquier componente
//   puede abrir sin que nadie se lo pase.
// =============================================================================

// La "forma" del contexto — lo que cualquier componente puede consumir
interface AuthContextType {
  user: AuthUser | null;           // null = no autenticado
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;              // true mientras verifica localStorage al inicio
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

// Creamos el contexto con un valor por defecto "vacío".
// Este valor solo se usa si alguien consume el contexto fuera del Provider.
export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

// El "dominio" de localStorage donde guardamos el token y usuario
const TOKEN_KEY = 'hogar_token';
const USER_KEY = 'hogar_user';

// =============================================================================
// AuthProvider — Envuelve la app y provee el estado de auth a todos los hijos
// =============================================================================
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // isLoading = true mientras leemos localStorage al montar la app
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Al montar el Provider (una sola vez), leemos la sesión guardada en localStorage.
  // Esto permite que al recargar el navegador, el usuario siga logueado.
  // Analogía: Como cuando Laravel lee la cookie de sesión al arrancar cada request.
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser) as AuthUser);
      }
    } catch {
      // Si algo falla (ej. JSON corrupto), limpiamos y empezamos de cero
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } finally {
      // Terminamos de verificar — ya podemos mostrar el UI correcto
      setIsLoading(false);
    }
  }, []);

  // Función para iniciar sesión — guarda en estado y en localStorage
  const login = useCallback((newUser: AuthUser, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  // Función para cerrar sesión — limpia todo
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user, // !! convierte user a boolean
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
