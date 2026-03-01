import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import { createCategory, deleteCategory } from '../services/categoryService';
import { useAuth } from '../hooks/useAuth';
import type { CategoryDto } from '../interfaces/finance.interfaces';

// =============================================================================
// components/CategoryManager.tsx
// =============================================================================
// Pantalla Mobile-First para CREAR y ELIMINAR categorías.
//
// Analogía Laravel: Este componente es como un "Blade View" que hace fetch
// a un controlador (categoryService) y muestra el resultado.
//
// ESTADO DE LA UI — ¿qué useStates usamos y por qué?
// ─────────────────────────────────────────────────────
//  newName         → El texto que el usuario escribe en el Input. Controlado
//                    por React (Controlled Component), es decir, React es el
//                    "dueño" del valor, no el DOM. Análogo a v-model en Vue
//                    o @bind en Blazor.
//
//  selectedColor   → El hex del botón de color actualmente seleccionado.
//                    Iniciamos con rojo como valor por defecto visual.
//
//  isCreating      → Booleano que disabilita el botón y muestra "Creando..."
//                    mientras esperamos el POST al backend (evita doble-click).
//
//  deletingId      → El ID de la categoría que se está borrando (string | null).
//                    Usamos un string en lugar de un boolean para poder mostrar
//                    un spinner específico en ESE elemento de la lista, no en todos.
//
//  formError       → Mensaje de error local del formulario (ej: "El nombre es requerido")
//
// Los datos de la lista vienen de `useCategories()`:
//   categories  → array de CategoryDto del backend
//   isLoading   → si está cargando la lista inicial
//   refetch     → función para volver a pedir la lista (la llamamos tras crear/borrar)
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Paleta de colores predefinidos
// ─────────────────────────────────────────────────────────────────────────────
// Cada objeto tiene:
//   hex   → el valor real que enviamos al backend
//   tw    → la clase de Tailwind para pintar el botón
//   label → para el atributo aria-label (accesibilidad)
interface ColorOption {
  hex: string;
  tw: string;
  label: string;
}

const COLOR_OPTIONS: ColorOption[] = [
  { hex: '#ef4444', tw: 'bg-red-500',    label: 'Rojo'    },
  { hex: '#f97316', tw: 'bg-orange-500', label: 'Naranja' },
  { hex: '#eab308', tw: 'bg-yellow-500', label: 'Amarillo' },
  { hex: '#22c55e', tw: 'bg-green-500',  label: 'Verde'   },
  { hex: '#3b82f6', tw: 'bg-blue-500',   label: 'Azul'    },
  { hex: '#a855f7', tw: 'bg-purple-500', label: 'Morado'  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: CategoryListItem
// ─────────────────────────────────────────────────────────────────────────────
// Lo separamos para mantener CategoryManager limpio.
// Recibe una categoría y un callback para el botón de eliminar.
//
// Props tipadas con una interface explícita — nunca usamos `any`.
interface CategoryListItemProps {
  category: CategoryDto;
  isDeleting: boolean; // true cuando ESTE item específico está siendo borrado
  onDelete: (id: string) => void;
}

function CategoryListItem({ category, isDeleting, onDelete }: CategoryListItemProps) {
  // El circulito de color: usamos `style` en lugar de una clase de Tailwind porque
  // el color viene de la BD en formato hex (#rrggbb), no tenemos una clase Tailwind
  // predefinida para cada hex arbitrario. `style` es la excepción válida aquí.
  const colorDot = category.color
    ? { backgroundColor: category.color }
    : { backgroundColor: '#94a3b8' }; // slate-400 como fallback

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm">
      {/* Sección izquierda: circulito + nombre */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Círculo de color con el hex de la BD */}
        <span
          className="h-4 w-4 flex-shrink-0 rounded-full"
          style={colorDot}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{category.name}</p>
          {/* Mostramos cuántas transacciones usa esta categoría */}
          <p className="text-xs text-slate-400">
            {category._count.transactions === 0
              ? 'Sin transacciones'
              : `${category._count.transactions} transacción${category._count.transactions !== 1 ? 'es' : ''}`}
          </p>
        </div>
      </div>

      {/* Botón de eliminar */}
      {/* Deshabilitamos el botón mientras se borra para evitar doble-click */}
      <button
        onClick={() => onDelete(category.id)}
        disabled={isDeleting}
        aria-label={`Eliminar categoría ${category.name}`}
        className={`
          flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl
          transition-colors duration-200
          ${isDeleting
            ? 'cursor-not-allowed bg-slate-100 text-slate-300'
            : 'bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 active:scale-95'
          }
        `}
      >
        {isDeleting ? (
          // Spinner pequeño mientras se hace el DELETE
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          // Ícono de basura SVG — sin dependencias externas
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
    </li>
  );
}

// =============================================================================
// Componente principal: CategoryManager
// =============================================================================
export function CategoryManager() {
  // ── Estado del formulario ──────────────────────────────────────────────────
  const [newName, setNewName]           = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_OPTIONS[0].hex);
  const [isCreating, setIsCreating]     = useState<boolean>(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [formError, setFormError]       = useState<string | null>(null);

  // ── Datos del servidor ─────────────────────────────────────────────────────
  // `useCategories` abstrae el GET /api/categories + manejo de loading/error.
  // Es como llamar Category::all() pero de forma reactiva y asíncrona.
  const { categories, isLoading, error: fetchError, refetch } = useCategories();

  // ── Token JWT ──────────────────────────────────────────────────────────────
  // Lo necesitamos para pasar el Authorization header en cada mutación.
  const { token } = useAuth();

  // ── Handler: Crear categoría ───────────────────────────────────────────────
  const handleCreate = async () => {
    // Validación cliente-side (el backend también valida con Zod, pero esto da
    // feedback instantáneo sin esperar la red — mejor UX en mobile).
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setFormError('El nombre de la categoría es requerido.');
      return;
    }
    if (!token) {
      setFormError('Sesión expirada. Por favor, inicia sesión de nuevo.');
      return;
    }

    // Iniciamos el estado de "cargando" para deshabilitar el botón
    setIsCreating(true);
    setFormError(null);

    try {
      // Llamamos al service que hace el POST al backend.
      // Cuando resuelve, `newCategory` contiene la entidad recién creada con su id.
      await createCategory({ name: trimmedName, color_hex: selectedColor }, token);

      // ✅ Éxito: limpiamos el formulario y pedimos la lista actualizada.
      // `refetch` incrementa el `fetchTrigger` en useCategories, lo que dispara
      // un nuevo useEffect → nuevo GET /api/categories → la lista se actualiza.
      setNewName('');
      setSelectedColor(COLOR_OPTIONS[0].hex);
      refetch();
    } catch (err) {
      // Capturamos el mensaje de error del service y lo mostramos en el UI.
      setFormError(err instanceof Error ? err.message : 'Error al crear la categoría.');
    } finally {
      // Siempre quitamos el "cargando", ya sea éxito o error.
      setIsCreating(false);
    }
  };

  // ── Handler: Eliminar categoría ────────────────────────────────────────────
  const handleDelete = async (categoryId: string) => {
    if (!token) return;

    // Guardamos el ID que se está borrando → CategoryListItem lo usa para
    // mostrar el spinner SOLO en ese elemento, no en toda la lista.
    setDeletingId(categoryId);

    try {
      await deleteCategory(categoryId, token);
      // ✅ Éxito: pedimos la lista actualizada. La categoría desaparecerá.
      refetch();
    } catch (err) {
      // Por simplicidad mostramos el error en el mismo formError.
      // En una app más grande usaríamos un sistema de toasts/notificaciones.
      setFormError(err instanceof Error ? err.message : 'Error al eliminar la categoría.');
    } finally {
      // Limpiamos el estado de "borrando" sin importar el resultado.
      setDeletingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    // Contenedor principal: padding generoso para que los thumbs no toquen bordes.
    // `max-w-md` limita el ancho en tablets/desktop y lo centra con `mx-auto`.
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">

      {/* ── Encabezado ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Categorías</h1>
        <p className="mt-1 text-sm text-slate-500">
          Organiza tus gastos e ingresos por categoría.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* FORMULARIO DE CREACIÓN                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Nueva categoría
        </h2>

        {/* Input de texto: nombre de la categoría */}
        {/* `value` + `onChange` → Controlled Component. React controla el valor. */}
        <div className="mb-4">
          <label htmlFor="category-name" className="mb-1.5 block text-sm font-medium text-slate-700">
            Nombre
          </label>
          <input
            id="category-name"
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              // Limpiamos el error cuando el usuario empieza a escribir de nuevo
              if (formError) setFormError(null);
            }}
            placeholder="Ej: Supermercado, Gasolina..."
            maxLength={50}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base
                       text-slate-800 placeholder-slate-300 outline-none transition
                       focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Selector visual de colores — 6 botones circulares */}
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-slate-700">Color</p>
          <div className="flex gap-3">
            {COLOR_OPTIONS.map((option) => {
              const isSelected = selectedColor === option.hex;
              return (
                <button
                  key={option.hex}
                  type="button"
                  onClick={() => setSelectedColor(option.hex)}
                  aria-label={`Seleccionar color ${option.label}`}
                  aria-pressed={isSelected}
                  className={`
                    ${option.tw}
                    h-10 w-10 flex-shrink-0 rounded-full transition-all duration-150
                    active:scale-90
                    ${isSelected
                      // Si está seleccionado: ring grueso blanco + shadow para que
                      // resalte bien sobre el fondo blanco de la tarjeta.
                      ? 'ring-4 ring-offset-2 ring-slate-800 scale-110'
                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }
                  `}
                />
              );
            })}
          </div>
        </div>

        {/* Mensaje de error del formulario */}
        {formError && (
          <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
            {formError}
          </p>
        )}

        {/* Botón de acción principal — ocupa todo el ancho (w-full) para que sea
            fácil de tocar con el pulgar en mobile. min-h-[52px] asegura área táctil
            suficiente según las guías de accesibilidad de Apple/Google (≥44px). */}
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className={`
            w-full min-h-[52px] rounded-xl font-semibold text-white
            transition-all duration-200 active:scale-95
            ${isCreating
              ? 'cursor-not-allowed bg-blue-300'
              : 'bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-200'
            }
          `}
        >
          {isCreating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creando...
            </span>
          ) : (
            'Crear Categoría'
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* LISTA DE CATEGORÍAS EXISTENTES                                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Mis categorías
        </h2>

        {/* Estado: cargando la lista inicial */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {/* Skeleton placeholders: le dan al usuario una idea de qué viene */}
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-[68px] animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        )}

        {/* Estado: error al cargar la lista */}
        {!isLoading && fetchError && (
          <div className="rounded-2xl bg-red-50 px-4 py-4 text-center text-sm text-red-600">
            <p className="font-medium">No pudimos cargar las categorías</p>
            <p className="mt-1 text-red-400">{fetchError}</p>
            <button
              onClick={refetch}
              className="mt-3 text-blue-500 underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Estado: lista vacía (sin error) */}
        {!isLoading && !fetchError && categories.length === 0 && (
          <div className="rounded-2xl bg-white px-4 py-8 text-center shadow-sm">
            <p className="text-3xl">🗂️</p>
            <p className="mt-2 font-medium text-slate-500">Aún no tienes categorías</p>
            <p className="mt-1 text-sm text-slate-400">Crea la primera usando el formulario de arriba.</p>
          </div>
        )}

        {/* Estado: lista con datos */}
        {!isLoading && !fetchError && categories.length > 0 && (
          // `gap-3` da espacio entre items para que los thumbs no choquen accidentalmente
          <ul className="flex flex-col gap-3">
            {categories.map((cat) => (
              <CategoryListItem
                key={cat.id}
                category={cat}
                // `deletingId === cat.id` → true SOLO para el item que se está borrando
                isDeleting={deletingId === cat.id}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
