import { useState, useEffect } from 'react';
import type { CategoryDto } from '../interfaces/finance.interfaces';
import { useAuth } from './useAuth';

// =============================================================================
// hooks/useCategories.ts — Custom Hook para cargar categorías desde la API
// =============================================================================
// Analogía Laravel: Es como llamar Category::all() en un controlador,
// pero en React con manejo de estado asíncrono.
//
// Patrón idéntico a useCalendarData, pero para categorías.
// Reutilizamos la misma estructura: { data, isLoading, error, refetch }
// para que la app sea predecible y fácil de mantener.
// =============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:3001`;

interface UseCategoriesReturn {
  categories: CategoryDto[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCategories(): UseCategoriesReturn {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Obtenemos el token JWT del contexto de autenticación.
  // Sin este token, el endpoint /api/categories devuelve 401.
  // Análogo a incluir el header `Authorization: Bearer token` en Guzzle de Laravel.
  const { token } = useAuth();

  useEffect(() => {
    // Si no hay token todavía (el usuario no está logueado), no hacemos fetch.
    // Esto evita un error 401 innecesario al arrancar la app.
    if (!token) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const loadCategories = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/categories`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            // ← CLAVE: enviamos el JWT en el header Authorization
            // El authMiddleware del backend lo leerá y extraerá el familyGroupId
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status} al cargar categorías`);
        }

        const data = await response.json() as CategoryDto[];

        if (!isCancelled) {
          setCategories(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Error desconocido');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      isCancelled = true;
    };
    // `token` es dependencia: si el token cambia (login/logout), volvemos a cargar
  }, [token, fetchTrigger]);

  const refetch = () => setFetchTrigger((prev) => prev + 1);

  return { categories, isLoading, error, refetch };
}
