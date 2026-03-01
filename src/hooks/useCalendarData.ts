import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import type { CalendarMonthResponse } from '../interfaces/finance.interfaces';
import { fetchCalendarMonth } from '../services/financeService';
import { useAuth } from './useAuth';

// =============================================================================
// hooks/useCalendarData.ts — Custom Hook
// =============================================================================
// Analogía Laravel: Un Custom Hook es como un Trait que encapsula lógica
// reutilizable. La diferencia: en React los hooks viven en el componente
// y tienen acceso al estado y ciclo de vida de React.
//
// Regla de oro de los hooks: un hook devuelve exactamente lo que el
// componente necesita — ni más, ni menos.
// =============================================================================

// La "forma" de lo que devuelve este hook.
// El componente que lo use solo necesita saber ESTO, no cómo funciona internamente.
interface UseCalendarDataReturn {
  // Los datos del mes (null mientras carga o si hay error)
  data: CalendarMonthResponse | null;
  // ¿Está cargando? Útil para mostrar un skeleton/spinner
  isLoading: boolean;
  // Mensaje de error si algo falló (null si todo bien)
  error: string | null;
  // Función para forzar un re-fetch manual (ej. después de agregar una transacción)
  refetch: () => void;
}

// Parámetros que recibe el hook
interface UseCalendarDataParams {
  // El Date del mes que queremos consultar
  currentDate: Date;
}

// =============================================================================
// useCalendarData — El hook en sí
// =============================================================================
export function useCalendarData({
  currentDate,
}: UseCalendarDataParams): UseCalendarDataReturn {
  // Obtenemos el token desde el contexto global de autenticación
  const { token } = useAuth();

  // -----------------------------------------------------------------------
  // Estado del hook — los 3 estados clásicos de cualquier petición asíncrona
  // -----------------------------------------------------------------------

  // `data`: almacena la respuesta del servidor cuando llega.
  // Empieza en null porque aún no hemos recibido nada.
  const [data, setData] = useState<CalendarMonthResponse | null>(null);

  // `isLoading`: true mientras la petición está "en vuelo".
  // Empieza en true para que el componente muestre el skeleton inmediatamente.
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // `error`: guarda el mensaje de error si la petición falla.
  // null = sin error.
  const [error, setError] = useState<string | null>(null);

  // `fetchTrigger`: un contador que usamos para forzar re-fetch.
  // Cada vez que refetch() incrementa este número, useEffect vuelve a correr.
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);

  // -----------------------------------------------------------------------
  // Convertimos la Date a "YYYY-MM" que necesita el endpoint.
  // `format` de date-fns hace esto de forma segura y legible.
  // Ejemplo: new Date(2025, 1, 1) → "2025-02"
  // -----------------------------------------------------------------------
  const monthString = format(currentDate, 'yyyy-MM');

  // -----------------------------------------------------------------------
  // useEffect: el "ciclo de vida" de React
  // -----------------------------------------------------------------------
  // Analogía Laravel: Como un observer que escucha un evento.
  // Este efecto se dispara cuando cambian: monthString, familyGroupId o fetchTrigger.
  //
  // El array `[monthString, familyGroupId, fetchTrigger]` es la lista de
  // "dependencias" — el efecto solo re-corre cuando alguna de estas cambia.
  // Si el array estuviera vacío `[]`, solo correría al montar el componente.
  // Si no tuviera array, correría en CADA render (peligroso — bucle infinito).
  // -----------------------------------------------------------------------
  useEffect(() => {
    // Creamos una bandera `isCancelled` para manejar el "race condition":
    // Si el usuario cambia de mes muy rápido, podrían llegar dos respuestas
    // fuera de orden. Con este flag, ignoramos las respuestas de fetches antiguos.
    // Esto es equivalente a cancelar una petición Guzzle en Laravel al recibir una nueva.
    let isCancelled = false;

    // Función async dentro del useEffect porque useEffect no puede ser async directamente.
    const loadData = async () => {
      // Reseteamos los estados ANTES de la petición para dar feedback inmediato.
      setIsLoading(true);
      setError(null);
      // No borramos `data` para evitar un "parpadeo" al cambiar de mes —
      // el usuario ve los datos anteriores mientras cargan los nuevos.

      try {
        // Si no hay token (ej. acaba de hacer logout), detenemos.
        if (!token) {
          setIsLoading(false);
          return;
        }

        const result = await fetchCalendarMonth({ month: monthString, token });
        // Si el componente se desmontó mientras esperábamos, ignoramos el resultado.
        if (!isCancelled) {
          setData(result);
        }
      } catch (err) {
        if (!isCancelled) {
          // Convertimos el error a string legible para mostrarlo en el UI.
          // `instanceof Error` verifica que sea un objeto Error de JS.
          const errorMessage = err instanceof Error
            ? err.message
            : 'Error desconocido al conectar con el servidor';

          setError(errorMessage);
          console.error('[useCalendarData] Error al cargar datos:', err);
        }
      } finally {
        // `finally` se ejecuta siempre, haya éxito o error.
        // Es el lugar perfecto para quitar el estado de carga.
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    // La función de "cleanup" del useEffect — corre cuando el componente
    // se desmonta o antes de que el efecto vuelva a correr.
    // Aquí activamos la bandera para ignorar respuestas tardías.
    return () => {
      isCancelled = true;
    };
  }, [monthString, token, fetchTrigger]);

  // -----------------------------------------------------------------------
  // `useCallback` memoriza la función `refetch` para que no cambie en cada render.
  // Sin useCallback, pasarla como prop recrearía el componente hijo innecesariamente.
  // Analogía: como cachear un resultado de consulta costosa en Laravel.
  // -----------------------------------------------------------------------
  const refetch = useCallback(() => {
    setFetchTrigger((prev) => prev + 1);
  }, []);

  // El hook devuelve exactamente lo que el componente necesita.
  return { data, isLoading, error, refetch };
}
