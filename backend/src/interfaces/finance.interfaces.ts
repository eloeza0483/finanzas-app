import { TransactionType, RecurrencePattern } from '@prisma/client';

// =============================================================================
// interfaces/finance.interfaces.ts
// =============================================================================
// Aquí definimos los "contratos" de TypeScript para nuestras respuestas.
// Analogía Laravel: Como los API Resources (app/Http/Resources) — definen
// la forma exacta en que los datos van a salir de la API al frontend.
//
// La diferencia clave: en TypeScript las interfaces NO generan código en tiempo
// de ejecución. Son solo para el compilador. Desaparecen al compilar.
// =============================================================================

// Representa una transacción individual tal como la devuelve la API.
// El `?` en un campo significa que es opcional (puede ser null/undefined).
export interface TransactionDto {
  id: string;
  title: string;
  // Convertimos Decimal de Prisma a number para facilitar el uso en el frontend.
  amount: number;
  type: TransactionType;
  date: Date;
  notes: string | null;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern | null;
  // Datos del usuario que la registró
  user: {
    id: string;
    name: string;
  };
  // Datos de la categoría (puede no tener categoría asignada)
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  // Flag especial: indica si esta entrada es una "proyección" de una transacción
  // recurrente (no existe directamente en la BD, la calculamos en el servicio).
  isProjected: boolean;
}

// La respuesta completa del endpoint GET /api/finances/calendar
export interface CalendarMonthResponse {
  // Mes consultado en formato "YYYY-MM"
  month: string;
  // Total de ingresos del mes (suma de todos los INCOME)
  totalIncome: number;
  // Total de gastos del mes (suma de todos los EXPENSE)
  totalExpenses: number;
  // Balance = totalIncome - totalExpenses
  balance: number;
  // La lista de todas las transacciones (reales + proyectadas)
  transactions: TransactionDto[];
}

// Parámetros que recibe el servicio (validados previamente por el controlador)
export interface GetCalendarMonthParams {
  month: number;  // 1-12
  year: number;
  familyGroupId: string;
}
