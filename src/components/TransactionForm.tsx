import React, { useState } from 'react';
import type { TransactionType, TransactionDto, RecurrencePattern } from '../interfaces/finance.interfaces';
import { useCategories } from '../hooks/useCategories';

// =============================================================================
// components/TransactionForm.tsx — Formulario para registrar transacciones
// =============================================================================
// Este componente permite agregar un Ingreso o Gasto al calendario.
// 
// ANTES (con mock data):
//   const MOCK_CATEGORIES = [{ id: '1', name: 'Despensa', icon: '🛒' }, ...]
//   <select> renderizaba esa lista fija.
//
// AHORA (con datos reales de PostgreSQL):
//   const { categories, isLoading } = useCategories()
//   <select> renderiza lo que devuelve el backend → datos reales del grupo.
// =============================================================================

// Lo que este componente notifica al padre cuando el usuario envía el form
export interface TransactionFormData {
  title: string;
  amount: number;
  type: TransactionType;
  date: string;            // "YYYY-MM-DD"
  categoryId: string;
  notes: string;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
}

// Props del componente
interface TransactionFormProps {
  // Día pre-seleccionado (ej. cuando el usuario toca una celda del calendario)
  defaultDate?: string;
  onSubmit: (data: TransactionFormData) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;   // true = el padre está guardando en la BD
  initialData?: TransactionDto; // Si viene este prop, estamos en modo Edición
}

// =============================================================================
// TransactionForm — Componente principal
// =============================================================================
const TransactionForm: React.FC<TransactionFormProps> = ({
  defaultDate,
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData,
}) => {
  // --- Estado local del formulario ---
  // Si tenemos initialData, pre-llenamos los estados
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() ?? '');
  const [type, setType] = useState<TransactionType>(initialData?.type ?? 'EXPENSE');
  
  // Date format needs to be YYYY-MM-DD for the input type="date"
  const defaultDateStr = initialData 
    ? initialData.date.split('T')[0] 
    : (defaultDate ?? new Date().toISOString().split('T')[0]);
  const [date, setDate] = useState(defaultDateStr);
  
  const [categoryId, setCategoryId] = useState(initialData?.category?.id ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring ?? false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>(
    initialData?.recurrencePattern ?? 'MONTHLY'
  );

  // Saber si estamos editando
  const isEditing = !!initialData;

  // =========================================================================
  // CONSUMO DEL HOOK — Aquí reemplazamos los mocks por datos reales de la API
  // =========================================================================
  // `useCategories` hace un fetch a GET /api/categories con el JWT automáticamente.
  // El hook maneja el ciclo de vida completo: loading → data | error.
  //
  // Si antes teníamos:
  //   const MOCK_CATEGORIES = [{ id: 'cat-despensa', name: 'Despensa', icon: '🛒' }]
  //
  // Ahora tenemos datos reales de PostgreSQL:
  //   categories = [{ id: 'cat-despensa', name: 'Despensa', icon: '🛒', ... }, ...]
  const { categories, isLoading: loadingCategories, error: categoriesError } = useCategories();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    await onSubmit({
      title: title.trim(),
      amount: parsedAmount,
      type,
      date,
      categoryId,
      notes: notes.trim(),
      isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : undefined,
    });
  };

  // Clases compartidas para los inputs — evitamos repetir la misma cadena de Tailwind
  const inputClass = `
    w-full rounded-xl border border-slate-600/50 bg-slate-900/60
    px-4 py-3 text-sm text-slate-100 placeholder-slate-600
    outline-none transition-all duration-200
    focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
    disabled:opacity-50
  `;

  const labelClass = 'text-xs font-medium text-slate-400 uppercase tracking-wide';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* === TIPO: Gasto o Ingreso === */}
      {/* Segmented control — toque en móvil más cómodo que un select */}
      <div className="flex rounded-xl overflow-hidden border border-slate-700">
        {(['EXPENSE', 'INCOME'] as TransactionType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`
              flex-1 py-2.5 text-sm font-semibold transition-colors
              ${type === t
                ? t === 'EXPENSE'
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }
            `}
          >
            {t === 'EXPENSE' ? '💸 Gasto' : '💰 Ingreso'}
          </button>
        ))}
      </div>

      {/* === TÍTULO === */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tx-title" className={labelClass}>Descripción</label>
        <input
          id="tx-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Despensa Chedraui, Quincena..."
          required
          className={inputClass}
        />
      </div>

      {/* === MONTO + FECHA (lado a lado en md+) === */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="tx-amount" className={labelClass}>Monto (MXN)</label>
          <input
            id="tx-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="tx-date" className={labelClass}>Fecha</label>
          <input
            id="tx-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={inputClass}
          />
        </div>
      </div>

      {/* === CATEGORÍA — SELECT CON DATOS REALES === */}
      {/*
        Aquí está el cambio principal respecto a la versión con mocks.
        
        Tres estados posibles del select:
        1. isLoading → opción "Cargando categorías..." y select deshabilitado
        2. categoriesError → opción de error y select deshabilitado
        3. categories.length > 0 → opciones reales de PostgreSQL
        
        En móvil, el <select> nativo del sistema es el más accesible y touch-friendly.
        Evitamos librerías de UI complejas para mantener el bundle pequeño.
      */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tx-category" className={labelClass}>
          Categoría
          {/* Indicador visual de carga junto al label */}
          {loadingCategories && (
            <span className="ml-2 inline-block h-3 w-3 rounded-full border border-slate-600 border-t-violet-400 animate-spin" />
          )}
        </label>

        <select
          id="tx-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          // Deshabilitamos mientras carga o hay error para evitar envíos inválidos
          disabled={loadingCategories || !!categoriesError}
          className={`${inputClass} cursor-pointer`}
        >
          {/* Opción por defecto — siempre presente */}
          <option value="" disabled>
            {loadingCategories
              ? 'Cargando categorías...'      // Estado: fetching
              : categoriesError
              ? '⚠️ Error al cargar'          // Estado: error
              : 'Selecciona una categoría'     // Estado: listo
            }
          </option>

          {/*
            Cuando los datos llegan de PostgreSQL, los mapeamos a <option>.
            Antes esto era un array hardcodeado como:
              [{ id: 'cat-despensa', name: 'Despensa', icon: '🛒' }]
            
            Ahora es dinámico: si Ernesto agrega "Gasolina" desde el gestor
            de categorías, aparecerá aquí automáticamente en el siguiente render.
          */}
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon ? `${cat.icon} ` : ''}{cat.name}
            </option>
          ))}
        </select>

        {/* Mensaje de error si el fetch de categorías falló */}
        {categoriesError && (
          <p className="text-xs text-rose-400 mt-1">
            No se pudieron cargar las categorías. Verifica tu conexión.
          </p>
        )}
      </div>

      {/* === NOTAS (opcional) === */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tx-notes" className={labelClass}>
          Notas <span className="text-slate-600 normal-case">(opcional)</span>
        </label>
        <textarea
          id="tx-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Detalles adicionales..."
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* === RECURRENTE === */}
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div className="relative">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="sr-only" // Oculto visualmente pero accesible para screen readers
            />
            {/* Toggle visual personalizado — más profesional que el checkbox nativo */}
            <div className={`
              h-5 w-9 rounded-full transition-colors
              ${isRecurring ? 'bg-violet-600' : 'bg-slate-700'}
            `} />
            <div className={`
              absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform
              ${isRecurring ? 'translate-x-4' : 'translate-x-0.5'}
            `} />
          </div>
          <span className="text-sm text-slate-300">¿Es un pago recurrente?</span>
        </label>

        {/* SELECT DE FRECUENCIA — Solo aparece si isRecurring es true */}
        {isRecurring && (
          <div className="pl-12">
            <select
              value={recurrencePattern}
              onChange={(e) => setRecurrencePattern(e.target.value as RecurrencePattern)}
              className={`${inputClass} text-sm cursor-pointer py-2`}
              title="Frecuencia de recurrencia"
            >
              <option value="WEEKLY">Semanal</option>
              <option value="BIWEEKLY">Quincenal</option>
              <option value="MONTHLY">Mensual</option>
            </select>
          </div>
        )}
      </div>

      {/* === BOTONES === */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-600 py-3 text-sm text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || loadingCategories}
          className={`
            flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-all
            flex items-center justify-center gap-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${type === 'EXPENSE'
              ? 'bg-rose-600 hover:bg-rose-500'
              : 'bg-emerald-600 hover:bg-emerald-500'
            }
          `}
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Guardando...
            </>
          ) : (
            `${isEditing ? 'Actualizar' : 'Registrar'} ${type === 'EXPENSE' ? 'Gasto' : 'Ingreso'}`
          )}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
