import { z } from 'zod';
import { Request, Response } from 'express';
import {
  getCategoriesByFamilyGroup,
  createCategory,
  deleteCategory,
} from '../services/CategoryService';

// =============================================================================
// controllers/CategoryController.ts
// =============================================================================
// Analogía Laravel: CategoryController.php con métodos index, store, destroy.
//
// Flujo de seguridad en CADA handler:
//   1. `authMiddleware` (aplicado en las rutas) verifica el JWT y pone `req.user`
//   2. El controlador lee `req.user.familyGroupId` del token — NUNCA del body
//   3. Ese familyGroupId se pasa al servicio para filtrar los datos
//
// Si el usuario no viene del JWT → authMiddleware ya devolvió 401 antes de llegar aquí.
// =============================================================================

// Zod v4: usa `message` en lugar de `required_error` (cambió en v4)
const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre no puede estar vacío')
    .max(50, 'El nombre no puede tener más de 50 caracteres')
    .trim(),

  color: z
    .string()
    .regex(
      /^#[0-9A-Fa-f]{6}$/,
      'El color debe ser un hexadecimal válido (ej. #10B981)',
    ),

  icon: z
    .string()
    .emoji('El ícono debe ser un emoji válido')
    .optional(),
});

// TypeScript infiere este tipo automáticamente desde el schema de Zod.
// No necesitamos definir una interfaz separada. 🎉
type CreateCategoryBody = z.infer<typeof createCategorySchema>;

// =============================================================================
// GET /api/categories
// Obtiene todas las categorías del grupo familiar del usuario autenticado
// =============================================================================
export async function handleGetCategories(req: Request, res: Response): Promise<void> {
  try {
    // `req.user` fue inyectado por `authMiddleware` — si llegamos aquí, existe.
    // El `!` (non-null assertion) le dice a TypeScript: "confío en que no es null".
    const { familyGroupId } = req.user!;

    if (!familyGroupId) {
      res.status(403).json({ error: 'El usuario no pertenece a un grupo familiar' });
      return;
    }

    const categories = await getCategoriesByFamilyGroup(familyGroupId);
    res.status(200).json(categories);
  } catch (error) {
    console.error('[CategoryController] Error en GET categories:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// =============================================================================
// POST /api/categories
// Crea una nueva categoría en el grupo familiar del usuario autenticado
// =============================================================================
export async function handleCreateCategory(req: Request, res: Response): Promise<void> {
  try {
    const { familyGroupId } = req.user!;

    if (!familyGroupId) {
      res.status(403).json({ error: 'El usuario no pertenece a un grupo familiar' });
      return;
    }

    // --- VALIDACIÓN CON ZOD ---
    // `safeParse` valida el body SIN lanzar excepciones.
    // Devuelve `{ success: true, data: ... }` o `{ success: false, error: ... }`.
    // Comparado con `parse()` que lanza un ZodError si falla.
    const validation = createCategorySchema.safeParse(req.body);

    if (!validation.success) {
      // `flatten()` convierte el error de Zod a un objeto legible:
      // { fieldErrors: { name: ['El nombre no puede estar vacío'], color: ['...'] } }
      res.status(400).json({
        error: 'Datos inválidos',
        details: validation.error.flatten().fieldErrors,
      });
      return;
    }

    // Si llegamos aquí, `validation.data` tiene el tipo `CreateCategoryBody`
    // con todos los campos validados y sanitizados (el .trim() del schema ya se aplicó).
    const body: CreateCategoryBody = validation.data;

    const newCategory = await createCategory({
      name: body.name,
      color: body.color,
      icon: body.icon,
      familyGroupId, // ← Siempre del JWT, nunca del body
    });

    res.status(201).json(newCategory);
  } catch (error) {
    console.error('[CategoryController] Error en POST category:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// =============================================================================
// DELETE /api/categories/:id
// Elimina una categoría — solo si pertenece al grupo del usuario autenticado
// =============================================================================
export async function handleDeleteCategory(req: Request, res: Response): Promise<void> {
  try {
    const { familyGroupId } = req.user!;
    // `req.params.id` = el :id de la URL: DELETE /api/categories/cat-despensa
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'El ID de la categoría es requerido' });
      return;
    }

    if (!familyGroupId) {
      res.status(403).json({ error: 'El usuario no pertenece a un grupo familiar' });
      return;
    }

    // El servicio usa familyGroupId en el WHERE — seguridad garantizada
    const result = await deleteCategory(id, familyGroupId);

    if (!result.deleted) {
      // 404 = no encontrado (o no pertenece al grupo — no revelamos cuál es)
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }

    // 204 No Content = operación exitosa sin cuerpo de respuesta
    res.status(204).send();
  } catch (error) {
    console.error('[CategoryController] Error en DELETE category:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
