// =============================================================================
// services/categoryService.ts — Capa de acceso a la API de Categorías
// =============================================================================
// Analogía Laravel: Esto es como un Repository o un API Client dedicado.
// Separamos las funciones de RED (fetch) del estado de UI (useState/useEffect).
//
// Responsabilidades:
//   · createCategory → POST /api/categories
//   · deleteCategory → DELETE /api/categories/:id
//
// El hook useCategories ya maneja el GET. Este service añade las mutaciones.
// =============================================================================

import type { CategoryDto } from '../interfaces/finance.interfaces';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:3001`;

// ─────────────────────────────────────────────────────────────────────────────
// Interfaz: qué datos enviamos al crear una categoría
// ─────────────────────────────────────────────────────────────────────────────
// Usamos `color_hex` para que coincida exactamente con el campo que espera
// el backend según el schema de Zod / Prisma definido anteriormente.
export interface CreateCategoryPayload {
  name: string;
  color_hex: string; // Ej: "#ef4444"  (red-500 en hex)
  icon?: string;     // Opcional; el backend lo acepta pero no es obligatorio
}

// ─────────────────────────────────────────────────────────────────────────────
// createCategory — POST /api/categories
// ─────────────────────────────────────────────────────────────────────────────
// Params:
//   payload → nombre + color del formulario
//   token   → JWT del AuthContext (necesario para que el backend identifique el familyGroupId)
//
// Returns: La CategoryDto recién creada (con el id asignado por la BD)
// ─────────────────────────────────────────────────────────────────────────────
export async function createCategory(
  payload: CreateCategoryPayload,
  token: string,
): Promise<CategoryDto> {
  const response = await fetch(`${API_BASE_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // El authMiddleware del backend lee este header para obtener el usuario
      'Authorization': `Bearer ${token}`,
    },
    // El backend (Zod) espera el campo como `color`, no `color_hex`.
    // Hacemos el mapeo aquí para no afectar al resto del frontend.
    body: JSON.stringify({
      name: payload.name,
      color: payload.color_hex,
      ...(payload.icon && { icon: payload.icon }),
    }),
  });

  if (!response.ok) {
    // Intentamos leer el mensaje de error del body (Zod puede devolver detalles)
    const errorBody = await response.json() as { error?: string };
    throw new Error(errorBody.error ?? `Error ${response.status} al crear categoría`);
  }

  return response.json() as Promise<CategoryDto>;
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteCategory — DELETE /api/categories/:id
// ─────────────────────────────────────────────────────────────────────────────
// Params:
//   categoryId → el UUID de la categoría a borrar
//   token      → JWT para autenticación
//
// Returns: void — si no lanza un error, la eliminación fue exitosa (204 No Content)
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteCategory(
  categoryId: string,
  token: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json() as { error?: string };
    throw new Error(errorBody.error ?? `Error ${response.status} al eliminar categoría`);
  }

  // Un DELETE exitoso devuelve 200 o 204 sin body. No retornamos nada.
}
