import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  handleGetCategories,
  handleCreateCategory,
  handleDeleteCategory,
} from '../controllers/CategoryController';

// =============================================================================
// routes/categoryRoutes.ts
// Montado en: /api/categories
// =============================================================================
// TODAS las rutas de categorías requieren autenticación.
// `authMiddleware` se aplica a level del Router, así protegemos cada
// ruta automáticamente sin tener que repetirlo en cada una.
//
// Analogía Laravel: Route::middleware('auth:sanctum')->group(function () { ... })
// =============================================================================

const categoryRouter = Router();

// Aplicar authMiddleware a TODAS las rutas de este router
// Equivale a agregar ->middleware('auth') a todo el grupo en Laravel.
categoryRouter.use(authMiddleware);

// GET    /api/categories           → listar categorías del grupo del usuario
// POST   /api/categories           → crear nueva categoría
// DELETE /api/categories/:id       → eliminar categoría por ID
categoryRouter.get('/', handleGetCategories);
categoryRouter.post('/', handleCreateCategory);
categoryRouter.delete('/:id', handleDeleteCategory);

export default categoryRouter;
