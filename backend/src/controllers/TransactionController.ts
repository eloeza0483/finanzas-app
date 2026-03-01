import { z } from 'zod';
import { Request, Response } from 'express';
import { getCalendarMonthTransactions, getCalendarMonthSummary, updateTransaction, deleteTransaction, CreateTransactionDto } from '../services/TransactionService';
import { createTransaction } from '../services/TransactionService';

// =============================================================================
// controllers/TransactionController.ts
// =============================================================================
// Analogía Laravel: TransactionController con index() y store().
// =============================================================================

// =============================================================================
// SCHEMA ZOD — Valida el body del POST /api/transactions
// =============================================================================
const createTransactionSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(100, 'El título no puede exceder 100 caracteres')
    .trim(),

  amount: z
    .number({ message: 'El monto debe ser un número' })
    .positive('El monto debe ser mayor a 0'),

  // Zod valida que el valor sea exactamente uno de estos dos strings
  type: z.enum(['INCOME', 'EXPENSE'], {
    message: 'El tipo debe ser INCOME o EXPENSE',
  }),

  // Fecha en string ISO "YYYY-MM-DD" — la convertimos a Date en el servicio
  date: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'La fecha debe tener el formato YYYY-MM-DD',
  ),

  categoryId: z.string().optional(),

  notes: z.string().max(500, 'Las notas no pueden exceder 500 caracteres').optional(),

  isRecurring: z.boolean().optional().default(false),

  // Solo tiene sentido si isRecurring = true
  recurrencePattern: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']).optional(),
});

// TypeScript infiere el tipo automáticamente desde el schema
type CreateTransactionBody = z.infer<typeof createTransactionSchema>;

// =============================================================================
// GET /api/finances/summary?month=YYYY-MM
// =============================================================================
export async function handleGetMonthSummary(req: Request, res: Response): Promise<void> {
  try {
    const { month } = req.query;
    const { familyGroupId } = req.user!;

    if (!familyGroupId) {
      res.status(403).json({ error: 'El usuario no pertenece a un grupo familiar' });
      return;
    }

    if (!month || typeof month !== 'string') {
      res.status(400).json({ error: 'El parámetro month es requerido (formato: YYYY-MM)' });
      return;
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      res.status(400).json({ error: 'Formato de mes inválido. Usa YYYY-MM (ej. 2025-02)' });
      return;
    }

    const summary = await getCalendarMonthSummary({ month: monthNum, year, familyGroupId });
    res.status(200).json(summary);
  } catch (error) {
    console.error('[TransactionController] Error en handleGetMonthSummary:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// =============================================================================
// GET /api/transactions/calendar?month=YYYY-MM
// =============================================================================
export async function getCalendarMonth(req: Request, res: Response): Promise<void> {
  try {
    const { month } = req.query;
    const { familyGroupId } = req.user!;

    if (!familyGroupId) {
      res.status(403).json({ error: 'El usuario no pertenece a un grupo familiar' });
      return;
    }

    if (!month || typeof month !== 'string') {
      res.status(400).json({ error: 'El parámetro month es requerido (formato: YYYY-MM)' });
      return;
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      res.status(400).json({ error: 'Formato de mes inválido. Usa YYYY-MM (ej. 2025-02)' });
      return;
    }

    const data = await getCalendarMonthTransactions({ month: monthNum, year, familyGroupId });
    res.status(200).json(data);
  } catch (error) {
    console.error('[TransactionController] Error en getCalendarMonth:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// =============================================================================
// POST /api/transactions
// Crea una nueva transacción para el grupo familiar del usuario autenticado
// =============================================================================
export async function handleCreateTransaction(req: Request, res: Response): Promise<void> {
  try {
    // Obtenemos userId y familyGroupId del JWT — el usuario no los controla
    const { userId, familyGroupId } = req.user!;

    if (!familyGroupId) {
      res.status(403).json({ error: 'El usuario no pertenece a un grupo familiar' });
      return;
    }

    // Validamos el body con Zod
    const validation = createTransactionSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const body: CreateTransactionBody = validation.data;

    // Si es recurrente pero no tiene patrón, asignamos MONTHLY por defecto
    const recurrencePattern = body.isRecurring
      ? (body.recurrencePattern ?? 'MONTHLY')
      : undefined;

    const newTransaction = await createTransaction({
      title: body.title,
      amount: body.amount,
      type: body.type,
      date: body.date,
      categoryId: body.categoryId,
      notes: body.notes,
      isRecurring: body.isRecurring ?? false,
      recurrencePattern,
      userId,          // ← Del JWT
      familyGroupId,   // ← Del JWT
    });

    // 201 Created = recurso creado exitosamente
    res.status(201).json(newTransaction);
  } catch (error) {
    console.error('[TransactionController] Error en handleCreateTransaction:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// =============================================================================
// PUT /api/transactions/:id
// =============================================================================
export async function handleUpdateTransaction(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { familyGroupId } = req.user!;

    if (!id) {
      res.status(400).json({ error: 'El ID de la transacción es requerido' });
      return;
    }

    if (!familyGroupId) {
      res.status(403).json({ error: 'El usuario no pertenece a un grupo familiar' });
      return;
    }

    // Usamos el mismo schema de creación pero con `.partial()` para que todos
    // los campos pasen a ser opcionales en una actualización (PATCH/PUT semántico).
    const updateSchema = createTransactionSchema.partial();
    
    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: validation.error.flatten().fieldErrors,
      });
      return;
    }

    const body = validation.data;

    try {
      // Requerimos castear el body al DTO final
      const updatedTransaction = await updateTransaction(
        id,
        familyGroupId,
        body as CreateTransactionDto
      );
      
      res.status(200).json(updatedTransaction);
    } catch (e: any) {
      if (e.message === 'TransactionNotFound') {
        res.status(404).json({ error: 'Transacción no encontrada' });
      } else if (e.message === 'UnauthorizedAccess') {
        res.status(403).json({ error: 'No tienes permiso para modificar esta transacción' });
      } else {
        throw e;
      }
    }
  } catch (error) {
    console.error('[TransactionController] Error en handleUpdateTransaction:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// =============================================================================
// DELETE /api/transactions/:id
// =============================================================================
export async function handleDeleteTransaction(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { familyGroupId } = req.user!;

    if (!id) {
      res.status(400).json({ error: 'El ID de la transacción es requerido' });
      return;
    }

    if (!familyGroupId) {
      res.status(403).json({ error: 'El usuario no pertenece a un grupo familiar' });
      return;
    }

    const result = await deleteTransaction(id, familyGroupId);

    if (!result.deleted) {
      res.status(404).json({ error: 'Transacción no encontrada o no pertenece a tu grupo' });
      return;
    }

    res.status(204).send(); // 204 No Content
  } catch (error) {
    console.error('[TransactionController] Error en handleDeleteTransaction:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
