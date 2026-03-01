import type { CalendarMonthResponse } from '../interfaces/finance.interfaces';
import type { TransactionFormData } from '../components/TransactionForm';

// =============================================================================
// services/financeService.ts — Capa de acceso a la API para Finanzas
// =============================================================================
// Analogía Laravel: Esto es como un Repository o un API Client.
// Su única responsabilidad: saber CÓMO y DÓNDE hablar con el backend.
// =============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:3001`;

// Parámetros que recibe la función de fetch
interface FetchCalendarParams {
  month: string;       // Formato "YYYY-MM", ej: "2025-02"
  token: string;       // JWT para autenticación
}

// =============================================================================
// fetchCalendarMonth — GET /api/finances/calendar
// =============================================================================
export async function fetchCalendarMonth(
  params: FetchCalendarParams,
): Promise<CalendarMonthResponse> {
  const { month, token } = params;

  const queryParams = new URLSearchParams({ month });
  const url = `${API_BASE_URL}/api/finances/calendar?${queryParams.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // ← Enviamos el JWT
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error ${response.status} del servidor: ${errorBody}`);
  }

  return response.json() as Promise<CalendarMonthResponse>;
}

export interface MonthSummaryResponse {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

// =============================================================================
// fetchMonthSummary — GET /api/finances/summary
// =============================================================================
export async function fetchMonthSummary(
  params: FetchCalendarParams,
): Promise<MonthSummaryResponse> {
  const { month, token } = params;

  const queryParams = new URLSearchParams({ month });
  const url = `${API_BASE_URL}/api/finances/summary?${queryParams.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error ${response.status} del servidor: ${errorBody}`);
  }

  return response.json() as Promise<MonthSummaryResponse>;
}

// Parámetros para crear una transacción
interface CreateTransactionParams {
  data: TransactionFormData; // DTO desde el TransactionForm
  token: string;             // JWT para autenticación
}

// =============================================================================
// createTransaction — POST /api/finances
// =============================================================================
export async function createTransaction(params: CreateTransactionParams): Promise<void> {
  const { data, token } = params;

  const response = await fetch(`${API_BASE_URL}/api/finances`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // ← Enviamos el JWT
    },
    // Convertimos el objeto a un string JSON para enviarlo en el body
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error al crear transacción: ${errorBody}`);
  }

  // Si todo via bien, el backend responde 201 Created.
  // No necesitamos devolver el JSON porque el frontend volverá a llamar a fetchCalendarMonth.
}

// Parámetros para actualizar una transacción
interface UpdateTransactionParams {
  id: string;                // ID de la transacción a actualizar
  data: Partial<TransactionFormData>; // DTO con los campos que cambiaron
  token: string;             // JWT para autenticación
}

// =============================================================================
// updateTransaction — PUT /api/finances/:id
// =============================================================================
export async function updateTransaction(params: UpdateTransactionParams): Promise<void> {
  const { id, data, token } = params;

  const response = await fetch(`${API_BASE_URL}/api/finances/${id}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error al actualizar transacción: ${errorBody}`);
  }
}

// Parámetros para eliminar una transacción
interface DeleteTransactionParams {
  id: string;                // ID de la transacción a borrar
  token: string;             // JWT para autenticación
}

// =============================================================================
// deleteTransaction — DELETE /api/finances/:id
// =============================================================================
export async function deleteTransaction(params: DeleteTransactionParams): Promise<void> {
  const { id, token } = params;

  const response = await fetch(`${API_BASE_URL}/api/finances/${id}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error al eliminar transacción: ${errorBody}`);
  }
}
