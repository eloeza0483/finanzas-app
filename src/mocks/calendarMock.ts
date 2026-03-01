import { CalendarMonthResponse } from '../interfaces/finance.interfaces';

// =============================================================================
// mocks/calendarMock.ts
// =============================================================================
// Datos de prueba que simulan la respuesta real del backend.
// Esto nos permite desarrollar el UI sin necesitar el servidor corriendo.
//
// Analogía Laravel: Como usar `factory()->create()` en tests, pero para UI.
// En el futuro, cuando el backend esté conectado, simplemente
// reemplazamos este import por una llamada real al endpoint.
// =============================================================================

// Generamos datos para febrero 2025 (mes corto, bueno para probar).
export const MOCK_CALENDAR_FEBRUARY: CalendarMonthResponse = {
  month: '2025-02',
  totalIncome: 32000,
  totalExpenses: 18450,
  balance: 13550,
  transactions: [
    // --- INGRESOS (INCOME) ---
    {
      id: 'tx-001',
      title: 'Quincena Ernesto',
      amount: 16000,
      type: 'INCOME',
      date: '2025-02-01T12:00:00.000Z',
      notes: null,
      isRecurring: true,
      recurrencePattern: 'BIWEEKLY',
      user: { id: 'u-01', name: 'Ernesto' },
      category: { id: 'cat-01', name: 'Sueldo', icon: '💼', color: '#22c55e' },
      isProjected: false,
    },
    {
      id: 'tx-002',
      title: 'Quincena Monse',
      amount: 16000,
      type: 'INCOME',
      date: '2025-02-15T12:00:00.000Z',
      notes: null,
      isRecurring: true,
      recurrencePattern: 'BIWEEKLY',
      user: { id: 'u-02', name: 'Monse' },
      category: { id: 'cat-01', name: 'Sueldo', icon: '💼', color: '#22c55e' },
      isProjected: true, // Esta es proyectada — calculada por el servicio
    },
    // --- GASTOS (EXPENSE) ---
    {
      id: 'tx-003',
      title: 'Renta',
      amount: 8500,
      type: 'EXPENSE',
      date: '2025-02-05T12:00:00.000Z',
      notes: 'Transferencia a casero',
      isRecurring: true,
      recurrencePattern: 'MONTHLY',
      user: { id: 'u-01', name: 'Ernesto' },
      category: { id: 'cat-02', name: 'Vivienda', icon: '🏠', color: '#f97316' },
      isProjected: true,
    },
    {
      id: 'tx-004',
      title: 'Despensa Chedraui',
      amount: 2300,
      type: 'EXPENSE',
      date: '2025-02-08T12:00:00.000Z',
      notes: null,
      isRecurring: false,
      recurrencePattern: null,
      user: { id: 'u-02', name: 'Monse' },
      category: { id: 'cat-03', name: 'Despensa', icon: '🛒', color: '#3b82f6' },
      isProjected: false,
    },
    {
      id: 'tx-005',
      title: 'Veterinario Michi',
      amount: 950,
      type: 'EXPENSE',
      date: '2025-02-12T12:00:00.000Z',
      notes: 'Vacuna anual',
      isRecurring: false,
      recurrencePattern: null,
      user: { id: 'u-02', name: 'Monse' },
      category: { id: 'cat-04', name: 'Mascotas', icon: '🐾', color: '#a855f7' },
      isProjected: false,
    },
    {
      id: 'tx-006',
      title: 'Netflix',
      amount: 219,
      type: 'EXPENSE',
      date: '2025-02-18T12:00:00.000Z',
      notes: null,
      isRecurring: true,
      recurrencePattern: 'MONTHLY',
      user: { id: 'u-01', name: 'Ernesto' },
      category: { id: 'cat-05', name: 'Entretenimiento', icon: '🎬', color: '#ef4444' },
      isProjected: true,
    },
    {
      id: 'tx-007',
      title: 'Luz + Internet',
      amount: 1480,
      type: 'EXPENSE',
      date: '2025-02-20T12:00:00.000Z',
      notes: null,
      isRecurring: true,
      recurrencePattern: 'MONTHLY',
      user: { id: 'u-01', name: 'Ernesto' },
      category: { id: 'cat-06', name: 'Servicios', icon: '💡', color: '#eab308' },
      isProjected: true,
    },
    {
      id: 'tx-008',
      title: 'Salida Restaurante',
      amount: 1200,
      type: 'EXPENSE',
      date: '2025-02-22T12:00:00.000Z',
      notes: 'Cumpleaños Monse ❤️',
      isRecurring: false,
      recurrencePattern: null,
      user: { id: 'u-01', name: 'Ernesto' },
      category: { id: 'cat-07', name: 'Restaurantes', icon: '🍽️', color: '#06b6d4' },
      isProjected: false,
    },
    {
      id: 'tx-009',
      title: 'Gym',
      amount: 500,
      type: 'EXPENSE',
      date: '2025-02-28T12:00:00.000Z',
      notes: null,
      isRecurring: true,
      recurrencePattern: 'MONTHLY',
      user: { id: 'u-02', name: 'Monse' },
      category: { id: 'cat-08', name: 'Salud', icon: '💪', color: '#10b981' },
      isProjected: true,
    },
  ],
};
