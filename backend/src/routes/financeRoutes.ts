import { Router } from 'express';
import { getCalendarMonth, handleGetMonthSummary, handleCreateTransaction, handleUpdateTransaction, handleDeleteTransaction } from '../controllers/TransactionController';
import { authMiddleware } from '../middleware/authMiddleware';

// =============================================================================
// routes/financeRoutes.ts
// =============================================================================
// Analogía Laravel: Esto es tu routes/api.php pero solo para finanzas y transacciones.
// =============================================================================

const financeRouter = Router();

// Todas las rutas de finanzas requieren estar autenticado
// Esto es como $router->middleware('auth:api') en Laravel
financeRouter.use(authMiddleware);

// GET /api/finances/summary?month=YYYY-MM
financeRouter.get('/summary', handleGetMonthSummary);

// GET /api/finances/calendar?month=YYYY-MM
financeRouter.get('/calendar', getCalendarMonth);

// POST /api/finances
financeRouter.post('/', handleCreateTransaction);

// PUT /api/finances/:id
financeRouter.put('/:id', handleUpdateTransaction);

// DELETE /api/finances/:id
financeRouter.delete('/:id', handleDeleteTransaction);

export default financeRouter;
