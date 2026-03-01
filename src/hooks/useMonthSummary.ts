import { useState, useEffect } from 'react';
import { fetchMonthSummary } from '../services/financeService';
import type { MonthSummaryResponse } from '../services/financeService';
import { useAuth } from './useAuth';

export function useMonthSummary(month: string, refreshTrigger: number) {
  const { token } = useAuth();
  
  const [summary, setSummary] = useState<MonthSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si no hay token, no intentamos hacer fetch.
    if (!token) {
      setIsLoading(false);
      return;
    }

    let isMounted = true; 

    const loadSummary = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await fetchMonthSummary({ month, token });

        if (isMounted) {
          setSummary(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error desconocido al cargar resumen');
          console.error('[useMonthSummary] Error:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, [month, refreshTrigger, token]); // Volver a ejecutar si cambia el mes, el token o hay un trigger

  return { summary, isLoading, error };
}
