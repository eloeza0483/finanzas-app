import prisma from '../lib/prisma';

// =============================================================================
// services/CategoryService.ts — Lógica de negocio de Categorías
// =============================================================================
// Analogía Laravel: Como un CategoryRepository — encapsula todos los accesos
// a la tabla `categories` usando Prisma.
//
// ¿Cómo garantizamos que un usuario solo vea/borre SUS categorías?
// → La respuesta es el campo `familyGroupId`.
// → El familyGroupId viene del JWT (token), NO del body del request.
//   Esto significa que el usuario no puede mentir sobre a qué grupo pertenece.
// → En CADA query agregamos `where: { familyGroupId }` para filtrar solo
//   los registros de ese grupo.
// → Analogía Laravel: Como usar policy / scope en Eloquent:
//   Category::where('family_group_id', auth()->user()->family_group_id)->get()
// =============================================================================

// --- TIPOS INTERNOS ---

export interface CreateCategoryData {
  name: string;
  color: string;   // Hex validado por Zod antes de llegar aquí, ej: "#10B981"
  icon?: string;   // Emoji opcional
  familyGroupId: string;
}

// La "proyección" de categoría que queremos devolver al cliente
export interface CategoryDto {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  familyGroupId: string;
  // Cuántas transacciones usan esta categoría — útil para el UI
  _count: { transactions: number };
}

// =============================================================================
// getCategoriesByFamilyGroup — Listar todas las categorías del grupo
// =============================================================================
export async function getCategoriesByFamilyGroup(
  familyGroupId: string,
): Promise<CategoryDto[]> {
  // El `where: { familyGroupId }` es la barrera de seguridad principal.
  // Un usuario con familyGroupId "grupo-A" NUNCA verá las categorías de "grupo-B".
  // Prisma convierte esto a: SELECT * FROM categories WHERE family_group_id = $1
  const categories = await prisma.category.findMany({
    where: { familyGroupId },
    // `_count` es una función de Prisma para contar relaciones anidadas.
    // Equivale a: SELECT COUNT(*) FROM transactions WHERE category_id = categories.id
    include: { _count: { select: { transactions: true } } },
    orderBy: { name: 'asc' },
  });

  return categories;
}

// =============================================================================
// createCategory — Crear una nueva categoría en el grupo
// =============================================================================
export async function createCategory(data: CreateCategoryData): Promise<CategoryDto> {
  // El familyGroupId viene del JWT (del controlador) — el usuario no lo controla.
  // Nunca lo tomamos del body del request, solo del token verificado.
  const category = await prisma.category.create({
    data: {
      name: data.name.trim(), // Limpiamos espacios extra del nombre
      color: data.color,
      icon: data.icon ?? null,
      familyGroupId: data.familyGroupId,
    },
    include: { _count: { select: { transactions: true } } },
  });

  return category;
}

// =============================================================================
// deleteCategory — Eliminar una categoría del grupo
// =============================================================================
export async function deleteCategory(
  categoryId: string,
  familyGroupId: string,  // Viene del JWT — garantiza ownership
): Promise<{ deleted: boolean }> {
  // CLAVE DE SEGURIDAD: el `where` incluye TANTO el id como el familyGroupId.
  // Esto previene que un usuario de "grupo-A" elimine una categoría de "grupo-B"
  // simplemente conociendo su ID.
  //
  // Si alguien intenta: DELETE /categories/cat-de-otro-grupo
  // → Prisma busca: id = 'cat-de-otro-grupo' AND familyGroupId = 'mi-grupo'
  // → No encuentra el registro → deleteMany devuelve count: 0 → no borra nada.
  //
  // En Laravel: Category::where('id', $id)->where('family_group_id', auth()->user()->family_group_id)->delete()
  const result = await prisma.category.deleteMany({
    where: {
      id: categoryId,
      familyGroupId, // ← Esta es la barrera de seguridad
    },
  });

  // `result.count` = cuántos registros fueron borrados (0 o 1)
  return { deleted: result.count > 0 };
}
