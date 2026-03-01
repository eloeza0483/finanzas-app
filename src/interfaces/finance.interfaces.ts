// =============================================================================
// interfaces/finance.interfaces.ts (Frontend)
// =============================================================================
// Espejo del TransactionDto que devuelve nuestro backend.
// Por qué duplicar: el frontend y backend son proyectos separados.
// En el futuro podríamos extraerlos a un paquete compartido (@org/types),
// pero por ahora esta separación es la forma estándar en monorepos.
// =============================================================================

// Estos Enums replican los del schema.prisma del backend.
// TypeScript en el frontend no tiene acceso directo a Prisma.
export type TransactionType = 'INCOME' | 'EXPENSE';
export type RecurrencePattern = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';

// Forma exacta de cada transacción que llega del endpoint /api/finances/calendar
export interface TransactionDto {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  date: string; // Llega como string ISO desde JSON (ej. "2025-02-15T00:00:00.000Z")
  notes: string | null;
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern | null;
  user: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  isProjected: boolean; // true = calculada (recurrente), false = registrada en BD
}

// Respuesta completa del endpoint GET /api/finances/calendar
export interface CalendarMonthResponse {
  month: string;        // "2025-02"
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactions: TransactionDto[];
}

// Categoría que llega del endpoint GET /api/categories
// Espejo del CategoryDto del backend (incluye el conteo de transacciones)
export interface CategoryDto {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  familyGroupId: string;
  _count: {
    transactions: number;
  };
}
