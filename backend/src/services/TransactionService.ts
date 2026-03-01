import {
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  eachDayOfInterval,
  addDays,
  isWithinInterval,
  getDay,
} from 'date-fns';
import { RecurrencePattern, Transaction } from '@prisma/client';
import prisma from '../lib/prisma';
import {
  CalendarMonthResponse,
  GetCalendarMonthParams,
  TransactionDto,
} from '../interfaces/finance.interfaces';

// =============================================================================
// services/TransactionService.ts — Lógica de Negocio de Finanzas
// =============================================================================
// Analogía Laravel: Este archivo es como un Service Class en Laravel
// (app/Services/TransactionService.php).
//
// La regla de oro: Los servicios NO saben nada de HTTP (nada de `req`/`res`).
// Solo reciben datos, procesan lógica, y devuelven resultados.
// El Controlador (FinanceController.ts) es quien habla con HTTP.
// =============================================================================

// Tipo interno que incluye las relaciones cargadas desde Prisma.
// En Laravel, esto sería como hacer ->with(['user', 'category']) en Eloquent.
type TransactionWithRelations = Transaction & {
  user: { id: string; name: string };
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
};

// =============================================================================
// FUNCIÓN AUXILIAR: mapToDto
// =============================================================================
// Convierte una fila de la BD (formato Prisma) al formato que queremos
// enviar al frontend (nuestro TransactionDto).
// Por qué: Prisma devuelve `amount` como tipo `Decimal` (objeto especial),
// pero el frontend necesita un `number` normal. Aquí hacemos esa conversión.
function mapToDto(tx: TransactionWithRelations, isProjected: boolean): TransactionDto {
  return {
    id: tx.id,
    title: tx.title,
    // `tx.amount.toNumber()` convierte el Decimal de Prisma a número JS normal.
    amount: Number(tx.amount),
    type: tx.type,
    date: tx.date,
    notes: tx.notes,
    isRecurring: tx.isRecurring,
    recurrencePattern: tx.recurrencePattern,
    user: tx.user,
    category: tx.category,
    isProjected, // true = proyectada (calculada), false = real (en la BD)
  };
}

// =============================================================================
// FUNCIÓN CENTRAL: projectRecurringTransactions
// =============================================================================
// Este es el corazón de la lógica de negocio. Responde la pregunta:
// "Dado que esta transacción se repite con este patrón, ¿cae en este mes?"
//
// Analogía: Como calcular si un pago de Netflix del 15 de enero
// también debe aparecer el 15 de febrero, 15 de marzo, etc.
// =============================================================================
function projectRecurringTransaction(
  tx: TransactionWithRelations,
  monthStart: Date,
  monthEnd: Date,
): TransactionDto[] {
  const projectedTransactions: TransactionDto[] = [];

  // La fecha original de la transacción (ej. 15 de enero 2025)
  const originalDate = new Date(tx.date);

  // Si la transacción ORIGINAL ya está en el mes objetivo, no la proyectamos.
  // El servicio la habrá recuperado de la BD directamente.
  if (isWithinInterval(originalDate, { start: monthStart, end: monthEnd })) {
    return [];
  }

  // La transacción debe haber empezado ANTES del mes que consultamos.
  // No tiene sentido proyectar una transacción del futuro.
  if (originalDate > monthEnd) {
    return [];
  }

  switch (tx.recurrencePattern) {
    // -------------------------------------------------------------------------
    // MENSUAL: El gasto/ingreso cae el mismo día de cada mes.
    // Ejemplo: Renta el día 1, Netflix el día 15.
    // -------------------------------------------------------------------------
    case RecurrencePattern.MONTHLY: {
      // Construimos la fecha proyectada para el mes consultado.
      // Usamos el mismo DÍA del mes que la original.
      // Ejemplo: original es 15 de enero → proyectada es 15 de febrero.
      const projectedDate = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        originalDate.getDate(), // ← El mismo día del mes (ej. 15)
      );

      // Si ese día existe en el mes (ej. el 31 no existe en febrero),
      // lo añadimos a las proyecciones.
      if (isWithinInterval(projectedDate, { start: monthStart, end: monthEnd })) {
        projectedTransactions.push(
          mapToDto({ ...tx, date: projectedDate }, true),
        );
      }
      break;
    }

    // -------------------------------------------------------------------------
    // QUINCENAL: El gasto/ingreso cae cada 14 días.
    // Ejemplo: Quincena los días 1 y 15 de cada mes.
    // -------------------------------------------------------------------------
    case RecurrencePattern.BIWEEKLY: {
      // Recorremos todos los días del mes para ver cuáles caen exactamente
      // en un múltiplo de 14 días desde la fecha original.
      const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      for (const day of allDaysInMonth) {
        // Calculamos la diferencia en días entre cada día del mes y la original.
        const diffInMs = day.getTime() - originalDate.getTime();
        const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

        // Si la diferencia es divisible por 14, ¡ese día es una ocurrencia!
        // Ejemplo: Original = 1 enero. Días 15 enero (diff=14), 29 enero (diff=28).
        if (diffInDays > 0 && diffInDays % 14 === 0) {
          projectedTransactions.push(
            mapToDto({ ...tx, date: day }, true),
          );
        }
      }
      break;
    }

    // -------------------------------------------------------------------------
    // SEMANAL: El gasto/ingreso cae cada 7 días.
    // Ejemplo: Tianguis cada domingo, clases cada lunes.
    // -------------------------------------------------------------------------
    case RecurrencePattern.WEEKLY: {
      // Obtenemos el día de la semana de la transacción original (0=Dom, 6=Sáb).
      const originalDayOfWeek = getDay(originalDate);

      // Obtenemos todas las semanas dentro del mes consultado.
      const weeksInMonth = eachWeekOfInterval(
        { start: monthStart, end: monthEnd },
        { weekStartsOn: 0 }, // 0 = domingo como inicio de semana
      );

      for (const weekStart of weeksInMonth) {
        // Para cada semana, calculamos el día exacto correspondiente.
        // Ejemplo: Si la original es lunes (1), sumamos 1 día al inicio de semana.
        const occurrenceDate = addDays(weekStart, originalDayOfWeek);

        if (isWithinInterval(occurrenceDate, { start: monthStart, end: monthEnd })) {
          projectedTransactions.push(
            mapToDto({ ...tx, date: occurrenceDate }, true),
          );
        }
      }
      break;
    }

    // CUSTOM: Por ahora no proyectamos — requiere lógica específica por caso.
    case RecurrencePattern.CUSTOM:
    default:
      break;
  }

  return projectedTransactions;
}

// =============================================================================
// FUNCIÓN PÚBLICA: getCalendarMonthTransactions
// =============================================================================
// Esta es la función que el Controlador llamará. Orquesta todo:
// 1. Busca transacciones reales del mes en la BD.
// 2. Busca transacciones recurrentes de cualquier fecha anterior.
// 3. Proyecta las recurrentes en el mes consultado.
// 4. Combina todo y calcula los totales.
// =============================================================================
export async function getCalendarMonthTransactions(
  params: GetCalendarMonthParams,
): Promise<CalendarMonthResponse> {
  const { month, year, familyGroupId } = params;

  // Calculamos el primer y último momento del mes consultado.
  // date-fns nos da funciones precisas para esto.
  // Ejemplo para Feb 2025: start = 2025-02-01T00:00:00, end = 2025-02-28T23:59:59
  const monthStart = startOfMonth(new Date(year, month - 1, 1)); // month-1 porque JS: 0=enero
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));

  // --- CONSULTA 1: Transacciones NO recurrentes del mes exacto ---
  // Son los gastos únicos que registraste en este mes.
  // Analogía Eloquent: Transaction::where('familyGroupId', ...)->whereBetween('date', ...)->get()
  const realTransactions = await prisma.transaction.findMany({
    where: {
      familyGroupId,
      isRecurring: false,
      date: {
        gte: monthStart, // gte = greater than or equal (>=)
        lte: monthEnd,   // lte = less than or equal (<=)
      },
    },
    // `include` en Prisma = `->with()` en Laravel Eloquent
    include: {
      user: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
    orderBy: { date: 'asc' },
  });

  // --- CONSULTA 2: TODAS las transacciones recurrentes del grupo ---
  // No filtramos por mes — queremos TODAS porque necesitamos proyectarlas.
  // Una transacción recurrente de enero debe aparecer en febrero, marzo, etc.
  const recurringTransactions = await prisma.transaction.findMany({
    where: {
      familyGroupId,
      isRecurring: true,
      // Solo traemos las que empezaron ANTES del fin del mes consultado.
      date: { lte: monthEnd },
    },
    include: {
      user: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
  });

  // Mapeamos las transacciones reales al DTO (isProjected = false)
  const realDtos = realTransactions.map((tx) =>
    mapToDto(tx as TransactionWithRelations, false),
  );

  // Para cada transacción recurrente, calculamos sus proyecciones en el mes.
  const projectedDtos = recurringTransactions.flatMap((tx) =>
    projectRecurringTransaction(tx as TransactionWithRelations, monthStart, monthEnd),
  );

  // Juntamos todo y ordenamos por fecha
  const allTransactions = [...realDtos, ...projectedDtos].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  // Calculamos los totales del mes con reduce.
  // `reduce` es como acumular: empieza en 0 y va sumando cada monto.
  const totalIncome = allTransactions
    .filter((tx) => tx.type === 'INCOME')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenses = allTransactions
    .filter((tx) => tx.type === 'EXPENSE')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return {
    month: `${year}-${String(month).padStart(2, '0')}`, // "2025-02"
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    transactions: allTransactions,
  };
}

// =============================================================================
// FUNCIÓN PÚBLICA: getCalendarMonthSummary
// =============================================================================
// Reutiliza la proyección del mes para devolver ÚNICAMENTE los totales
// y optimizar el rendimiento y el payload enviado al frontend.
// =============================================================================
export async function getCalendarMonthSummary(
  params: GetCalendarMonthParams,
): Promise<{ totalIncome: number; totalExpense: number; balance: number }> {
  const { totalIncome, totalExpenses, balance } = await getCalendarMonthTransactions(params);
  return { totalIncome, totalExpense: totalExpenses, balance };
}

// =============================================================================
// FUNCIÓN PÚBLICA: createTransaction — Guardar un nuevo movimiento en la BD
// =============================================================================
// Recibe el DTO validado del controlador, lo persiste con Prisma y devuelve
// la transacción completa con sus relaciones (user + category).
//
// Analogía Laravel: Transaction::create($validated) + ->load(['user','category'])
// =============================================================================

export interface CreateTransactionDto {
  title: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;             // "YYYY-MM-DD" — lo convertimos a Date aquí
  categoryId?: string;
  notes?: string;
  isRecurring: boolean;
  recurrencePattern?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  userId: string;           // Del JWT — quién registra la transacción
  familyGroupId: string;    // Del JWT — a qué grupo pertenece
}

export async function createTransaction(dto: CreateTransactionDto): Promise<TransactionDto> {
  const {
    title, amount, type, date, categoryId, notes,
    isRecurring, recurrencePattern, userId, familyGroupId,
  } = dto;

  // Convertimos el string "YYYY-MM-DD" a un objeto Date.
  // `new Date("2025-02-15")` → Date object para PostgreSQL.
  const parsedDate = new Date(date);

  // `prisma.transaction.create` equivale a INSERT INTO transactions (...) VALUES (...)
  const transaction = await prisma.transaction.create({
    data: {
      title,
      // Prisma acepta `number` para columnas Decimal — lo convierte internamente.
      amount,
      type,
      date: parsedDate,
      notes: notes ?? null,
      isRecurring,
      // Si no es recurrente o no viene el patrón, lo dejamos null.
      recurrencePattern: isRecurring && recurrencePattern ? recurrencePattern : null,
      // Conectamos las relaciones usando los IDs del JWT (seguro).
      userId,
      familyGroupId,
      // categoryId es opcional — si viene undefined, Prisma lo omite.
      ...(categoryId ? { categoryId } : {}),
    },
    // Incluimos las relaciones para devolverlas al frontend de una vez.
    // Evita un segundo query: Prisma hace el JOIN automáticamente.
    include: {
      user: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
  });

  // Usamos el mapper ya existente para normalizar el tipo Decimal → number
  return mapToDto(transaction as TransactionWithRelations, false);
}

// =============================================================================
// FUNCIÓN PÚBLICA: updateTransaction — Actualizar un movimiento existente
// =============================================================================
export async function updateTransaction(
  id: string,
  familyGroupId: string,
  dto: Partial<CreateTransactionDto>,
): Promise<TransactionDto> {
  // Primero verificamos que la transacción exista y pertenezca al familyGroupId.
  // Esto previene que un usuario malicioso intente modificar transacciones de otras familias
  // solo adivinando el ID.
  const existingTransaction = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!existingTransaction) {
    throw new Error('TransactionNotFound');
  }

  if (existingTransaction.familyGroupId !== familyGroupId) {
    throw new Error('UnauthorizedAccess');
  }

  // Preparamos los datos a actualizar
  const dataToUpdate: any = {};
  
  if (dto.title !== undefined) dataToUpdate.title = dto.title;
  if (dto.amount !== undefined) dataToUpdate.amount = dto.amount;
  if (dto.type !== undefined) dataToUpdate.type = dto.type;
  if (dto.date !== undefined) dataToUpdate.date = new Date(dto.date);
  if (dto.notes !== undefined) dataToUpdate.notes = dto.notes === '' ? null : dto.notes;
  if (dto.isRecurring !== undefined) dataToUpdate.isRecurring = dto.isRecurring;
  
  // Manejo de categoría:
  // Si envían null o undefined, verificamos si querían quitarla explícitamente.
  // En nuestro esquema actual, si envían undefined es que no quieren actualizarla,
  // si quisieran borrarla enviarían null (aunque en este app no se permite quitar categoría, se cambia por otra o queda 'Sin categoría')
  if (dto.categoryId !== undefined) {
    dataToUpdate.categoryId = dto.categoryId || null;
  }

  if (dto.isRecurring !== undefined || dto.recurrencePattern !== undefined) {
    const isRec = dto.isRecurring ?? existingTransaction.isRecurring;
    if (!isRec) {
      dataToUpdate.recurrencePattern = null;
    } else if (dto.recurrencePattern) {
      dataToUpdate.recurrencePattern = dto.recurrencePattern;
    }
  }

  const updatedTransaction = await prisma.transaction.update({
    where: { id },
    data: dataToUpdate,
    include: {
      user: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
  });

  return mapToDto(updatedTransaction as TransactionWithRelations, false);
}

// =============================================================================
// FUNCIÓN PÚBLICA: deleteTransaction — Eliminar un movimiento
// =============================================================================
export async function deleteTransaction(
  id: string,
  familyGroupId: string,
): Promise<{ deleted: boolean }> {
  // Delete Many es más seguro porque podemos poner la condición del familyGroupId directamente
  // Si hiciéramos solo delete(id), si el usuario pasa un ID que no es suyo lo borraría de todos modos.
  const result = await prisma.transaction.deleteMany({
    where: {
      id,
      familyGroupId,
    },
  });

  return { deleted: result.count > 0 };
}
