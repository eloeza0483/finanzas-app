import React, { useMemo, useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { TransactionDto } from '../interfaces/finance.interfaces';
import { useCalendarData } from '../hooks/useCalendarData';
import MonthSummaryCard from './MonthSummaryCard';

// =============================================================================
// CalendarGrid.tsx
// =============================================================================
// El componente central de la app: muestra un mes en formato de cuadrícula
// con las transacciones del día renderizadas como píldoras de color.
//
// Mobile-First: Todo el diseño parte desde pantalla pequeña (320px)
// y se expande para pantallas más grandes con los prefijos sm:, md:, lg: de Tailwind.
// =============================================================================

// --- SUB-INTERFACES ---
// Props del componente principal
interface CalendarGridProps {
  // Disparador para forzar una recarga manual desde el padre (App.tsx)
  refreshTrigger?: number;
  onEditTransaction?: (tx: TransactionDto) => void;
  onDeleteTransaction?: (tx: TransactionDto) => void;
}

// Props de la celda individual de cada día
interface DayCellProps {
  date: Date;
  transactions: TransactionDto[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onClick: (date: Date, transactions: TransactionDto[]) => void;
}

// Props del panel lateral de detalle
interface DayDetailPanelProps {
  date: Date | null;
  transactions: TransactionDto[];
  onClose: () => void;
}

// =============================================================================
// COMPONENTE: TransactionPill
// =============================================================================
// La pequeña "píldora" o indicador de color que aparece dentro de cada día.
// =============================================================================
const TransactionPill: React.FC<{ tx: TransactionDto }> = ({ tx }) => {
  const isIncome = tx.type === 'INCOME';

  // Tailwind Mobile-First: En móvil solo mostramos un punto (w-2 h-2).
  // En pantallas medianas (md:) expandimos a una píldora con texto.
  return (
    <div
      className={`
        flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium
        truncate max-w-full
        ${isIncome
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
        }
        ${tx.isProjected ? 'opacity-60 border-dashed' : ''}
      `}
      title={`${tx.title} — $${tx.amount.toLocaleString('es-MX')}`}
    >
      {/* Punto de color: siempre visible */}
      <span
        className={`shrink-0 w-1.5 h-1.5 rounded-full ${isIncome ? 'bg-emerald-400' : 'bg-rose-400'}`}
      />
      {/* Texto: solo visible en md: para no saturar la celda en móvil */}
      <span className="hidden md:block truncate">{tx.title}</span>
    </div>
  );
};

// =============================================================================
// COMPONENTE: DayCell
// =============================================================================
// Una celda individual del calendario. Representa UN día del mes.
// touch-friendly: min-h-[60px] en móvil · min-h-[100px] en desktop.
// =============================================================================
const DayCell: React.FC<DayCellProps> = ({
  date,
  transactions,
  isCurrentMonth,
  isToday,
  onClick,
}) => {
  const hasIncome = transactions.some((tx) => tx.type === 'INCOME');
  const hasExpense = transactions.some((tx) => tx.type === 'EXPENSE');

  // Límite de píldoras visibles: máximo 2 en móvil para no saturar la celda.
  // El "+N" muestra cuántas quedan ocultas.
  const MAX_VISIBLE = 2;
  const visibleTxs = transactions.slice(0, MAX_VISIBLE);
  const hiddenCount = transactions.length - MAX_VISIBLE;

  return (
    <button
      // `onClick` notifica al padre qué día fue seleccionado y sus transacciones.
      // Esto es el patrón "lifting state up": el padre (CalendarGrid) maneja el estado.
      onClick={() => onClick(date, transactions)}
      className={`
        group relative flex flex-col gap-1 rounded-xl border p-1.5 md:p-2
        text-left transition-all duration-200 cursor-pointer
        min-h-[60px] md:min-h-[100px]

        ${isCurrentMonth
          ? 'border-slate-700/50 bg-slate-800/60 hover:bg-slate-700/80 hover:border-slate-500'
          : 'border-slate-800/30 bg-slate-900/30 opacity-40'
        }
        ${isToday
          ? 'border-violet-500/70 bg-violet-950/40 ring-1 ring-violet-500/30'
          : ''
        }
        ${transactions.length > 0 ? 'hover:scale-[1.02]' : ''}
      `}
    >
      {/* Número del día */}
      <div className="flex items-center justify-between">
        <span
          className={`
            text-xs font-semibold leading-none
            ${isToday
              ? 'flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white'
              : isCurrentMonth ? 'text-slate-300' : 'text-slate-600'
            }
          `}
        >
          {format(date, 'd')}
        </span>

        {/* Indicadores rápidos Income/Expense en la esquina superior derecha */}
        {/* Solo se muestran en móvil cuando hay transacciones */}
        {(hasIncome || hasExpense) && (
          <div className="flex gap-0.5 md:hidden">
            {hasIncome && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            {hasExpense && <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />}
          </div>
        )}
      </div>

      {/* Píldoras de transacciones — solo en md: para no saturar en móvil */}
      <div className="hidden md:flex flex-col gap-0.5 min-w-0">
        {visibleTxs.map((tx) => (
          <TransactionPill key={tx.id} tx={tx} />
        ))}
        {hiddenCount > 0 && (
          <span className="text-[10px] text-slate-500 font-medium pl-1">
            +{hiddenCount} más
          </span>
        )}
      </div>
    </button>
  );
};

// =============================================================================
// COMPONENTE: DayDetailPanel
// =============================================================================
// Panel deslizable que aparece al tocar un día con transacciones.
// En móvil ocupa la parte inferior de la pantalla (patrón "bottom sheet").
// =============================================================================
interface DayDetailPanelExtendedProps extends DayDetailPanelProps {
  onEdit: (tx: TransactionDto) => void;
  onDelete: (tx: TransactionDto) => void;
}

const DayDetailPanel: React.FC<DayDetailPanelExtendedProps> = ({ date, transactions, onClose, onEdit, onDelete }) => {
  if (!date) return null;

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  return (
    // Overlay oscuro que cubre el fondo al abrir el panel
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel en sí — `onClick` con stopPropagation evita cerrar al tocar dentro */}
      <div
        className={`
          absolute bottom-0 left-0 right-0 z-50
          rounded-t-2xl bg-slate-900 border-t border-slate-700
          p-5 max-h-[70vh] overflow-y-auto
          animate-in slide-in-from-bottom duration-300
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle visual del bottom sheet */}
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-600" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100">
            {format(date, "EEEE d 'de' MMMM", { locale: es })}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Resumen del día */}
        {transactions.length > 0 && (
          <div className="flex gap-3 mb-4">
            {totalIncome > 0 && (
              <div className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <p className="text-xs text-emerald-400 font-medium">Ingresos</p>
                <p className="text-base font-bold text-emerald-300">
                  ${totalIncome.toLocaleString('es-MX')}
                </p>
              </div>
            )}
            {totalExpenses > 0 && (
              <div className="flex-1 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3">
                <p className="text-xs text-rose-400 font-medium">Gastos</p>
                <p className="text-base font-bold text-rose-300">
                  ${totalExpenses.toLocaleString('es-MX')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Lista de transacciones del día */}
        {transactions.length === 0 ? (
          <p className="text-center text-slate-500 py-6">Sin movimientos este día</p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className={`
                  flex items-center justify-between gap-3 rounded-xl p-3 border group
                  ${tx.type === 'INCOME'
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-rose-500/10 border-rose-500/20'
                  }
                `}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Ícono de categoría */}
                  <span className="text-xl shrink-0">
                    {tx.category?.icon ?? (tx.type === 'INCOME' ? '💰' : '💸')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{tx.title}</p>
                    <p className="text-xs text-slate-400">
                      {tx.user.name} · {tx.category?.name ?? 'Sin categoría'}
                      {tx.isProjected && ' · 🔄 Recurrente'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <p className={`
                    text-sm font-bold
                    ${tx.type === 'INCOME' ? 'text-emerald-300' : 'text-rose-300'}
                  `}>
                    {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toLocaleString('es-MX')}
                  </p>

                  {/* Acciones (Editar/Eliminar) - Visibles siempre en móvil, en hover en desktop */}
                  {!tx.isProjected && ( // Solo permitimos modificar transacciones reales, no las puras proyecciones
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(tx)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                        aria-label="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(tx)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        aria-label="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// COMPONENTE: CalendarSkeleton
// =============================================================================
// Pantalla de carga mientras el hook fetcha los datos.
// Un "skeleton" es un placeholder que imita la forma del contenido real,
// dando una mejor UX que un spinner genérico.
// Analogía UX: Como los placeholders grises de Facebook mientras carga el feed.
// =============================================================================
const CalendarSkeleton: React.FC = () => (
  <div className="w-full max-w-2xl mx-auto px-3 py-4 md:px-6 md:py-6 animate-pulse">
    {/* Skeleton del encabezado */}
    <div className="flex items-center justify-between mb-6">
      <div className="h-8 w-8 rounded-xl bg-slate-700" />
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-40 rounded-lg bg-slate-700" />
        <div className="h-3 w-56 rounded-md bg-slate-800" />
      </div>
      <div className="h-8 w-8 rounded-xl bg-slate-700" />
    </div>
    {/* Skeleton de la cuadrícula */}
    <div className="grid grid-cols-7 gap-1 md:gap-1.5">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="min-h-[60px] md:min-h-[100px] rounded-xl bg-slate-800/60" />
      ))}
    </div>
  </div>
);

// =============================================================================
// COMPONENTE PRINCIPAL: CalendarGrid
// =============================================================================
const CalendarGrid: React.FC<CalendarGridProps> = ({ refreshTrigger = 0, onEditTransaction, onDeleteTransaction }) => {
  // Estado del mes actualmente visible en el calendario.
  // Inicializamos en el mes actual usando `new Date()`.
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const now = new Date();
    // Creamos el primer día del mes actual para tener un punto de referencia limpio.
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Estado del día seleccionado (para mostrar el panel de detalle).
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<TransactionDto[]>([]);

  // =============================================================================
  // HOOK DE DATOS — aquí reemplazamos los mocks por datos reales
  // =============================================================================
  // `useCalendarData` maneja todo el ciclo de vida del fetch:
  //   1. isLoading = true al iniciar (mostramos skeleton)
  //   2. Hace el fetch al backend con el mes actual
  //   3. data llega → re-render con datos reales
  //   4. Si hay error → isLoading = false, error = mensaje
  //   5. refetch() permite reintentar manualmente
  const { data, isLoading, error, refetch } = useCalendarData({
    currentDate,
  });

  // Re-hacer el fetch cuando el padre lo solicite (ej. al agregar nueva transacción)
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  // `useMemo` calcula los días del mes actual SOLO cuando `currentDate` cambia.
  // Sin useMemo, este cálculo se repetiría en cada re-render (aunque el mes no cambie).
  // Analogía: como cachear una consulta Eloquent costosa.
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    // Todos los días del mes (ej. del 1 al 28 para febrero)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Calculamos cuántos días vacíos poner al inicio.
    // getDay() devuelve 0=domingo, 1=lunes... pero nuestra semana empieza en lunes.
    // Fórmula: (díaDeLaSemana + 6) % 7 convierte domingo(0)→6, lunes(1)→0, etc.
    const startDayOfWeek = (getDay(monthStart) + 6) % 7;

    return { days, startDayOfWeek };
  }, [currentDate]);

  // `useMemo` crea un mapa de fecha → transacciones del día para búsqueda O(1).
  // Si data es null (cargando), el mapa queda vacío y las celdas no muestran nada.
  const transactionsByDay = useMemo(() => {
    const map = new Map<string, TransactionDto[]>();
    if (!data) return map; // Guard: si no hay data aún, retornamos mapa vacío

    data.transactions.forEach((tx) => {
      // Parseamos el string ISO a Date.
      // `parseISO` de date-fns maneja zonas horarias correctamente.
      const txDate = parseISO(tx.date);
      // Usamos la fecha en formato "YYYY-MM-DD" como clave del mapa.
      const key = format(txDate, 'yyyy-MM-dd');

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(tx);
    });

    return map;
  }, [data]);

  // Handlers para navegar entre meses
  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

  const handleDayClick = (date: Date, transactions: TransactionDto[]) => {
    setSelectedDay(date);
    setSelectedTransactions(transactions);
  };

  const handleClosePanel = () => {
    setSelectedDay(null);
    setSelectedTransactions([]);
  };

  const today = new Date();

  // Días de la semana — empezamos en lunes (estándar latinoamericano)
  const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // =============================================================================
  // ESTADOS ESPECIALES: Loading y Error
  // =============================================================================
  // Estos returns tempranos son el patrón estándar en React para casos especiales.
  // Analogía: como los guard clauses en PHP (@throws, return early).

  // ESTADO: Cargando (primera carga — data es null)
  if (isLoading && !data) {
    return <CalendarSkeleton />;
  }

  // ESTADO: Error de conexión
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 px-6">
        <span className="text-4xl">⚠️</span>
        <div className="text-center">
          <p className="text-slate-300 font-semibold mb-1">No se pudo conectar al servidor</p>
          <p className="text-slate-500 text-sm max-w-xs">{error}</p>
        </div>
        {/* Botón de reintento — llama a refetch() del hook */}
        <button
          onClick={refetch}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-3 py-4 md:px-6 md:py-6">

      {/* === TARJETA DE RESUMEN DEL MES (DASHBOARD) === */}
      <MonthSummaryCard 
        month={format(currentDate, 'yyyy-MM')} 
        refreshTrigger={refreshTrigger} 
      />

      {/* === ENCABEZADO: Navegación del mes === */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors active:scale-95"
          aria-label="Mes anterior"
        >
          ←
        </button>

        <div className="text-center">
          {/* Mes en grande — capitaliza la primera letra */}
          <h2 className="text-xl font-bold text-slate-100 capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
            {/* Indicador de recarga — el spinner aparece cuando hay un re-fetch
                (ej. al cambiar de mes con data previa aún visible) */}
            {isLoading && (
              <span className="ml-2 inline-block h-3 w-3 rounded-full border-2 border-slate-500 border-t-violet-400 animate-spin" />
            )}
          </h2>
          {/* Resumen del mes — mostramos guiones si aún no llegó la data */}
          <p className="text-xs text-slate-400 mt-0.5">
            <span className="text-emerald-400">
              +${(data?.totalIncome ?? 0).toLocaleString('es-MX')}
            </span>
            {' · '}
            <span className="text-rose-400">
              -${(data?.totalExpenses ?? 0).toLocaleString('es-MX')}
            </span>
            {' · '}
            <span className={(data?.balance ?? 0) >= 0 ? 'text-violet-400' : 'text-amber-400'}>
              Balance: ${(data?.balance ?? 0).toLocaleString('es-MX')}
            </span>
          </p>
        </div>

        <button
          onClick={handleNextMonth}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors active:scale-95"
          aria-label="Mes siguiente"
        >
          →
        </button>
      </div>

      {/* === ENCABEZADO DE LA SEMANA: Lun - Dom === */}
      {/*
        `grid-cols-7` divide el contenedor en 7 columnas iguales.
        Tailwind Mobile-First: Esta cuadrícula es siempre de 7 columnas,
        porque el calendario SIEMPRE tiene 7 días, independiente del tamaño.
      */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* === CUADRÍCULA DE DÍAS === */}
      {/*
        `grid grid-cols-7`: 7 columnas para los 7 días de la semana.
        `gap-1`: espacio pequeño entre celdas (4px). En md: lo aumentamos a gap-1.5.
        
        ¿Por qué NO usamos `grid-cols-7` responsivo?
        Porque el calendario SIEMPRE es de 7 columnas. Lo que cambia es el CONTENIDO
        de cada celda (píldoras ocultas en móvil, visibles en desktop).
        Mobile-First en el calendario = ajustar el contenido, no la estructura.
      */}
      <div className="grid grid-cols-7 gap-1 md:gap-1.5">
        {/* Celdas vacías para alinear el inicio del mes con el día correcto */}
        {Array.from({ length: calendarDays.startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[60px] md:min-h-[100px]" />
        ))}

        {/* Celda de cada día del mes */}
        {calendarDays.days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTransactions = transactionsByDay.get(key) ?? [];

          return (
            <DayCell
              key={key}
              date={day}
              transactions={dayTransactions}
              isCurrentMonth={isSameMonth(day, currentDate)}
              isToday={isSameDay(day, today)}
              onClick={handleDayClick}
            />
          );
        })}
      </div>

      {/* === LEYENDA === */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Ingreso</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          <span>Gasto</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-dashed border-slate-500" />
          <span>Proyectado</span>
        </div>
      </div>

      {/* === PANEL DE DETALLE DEL DÍA === */}
      {selectedDay && (
        <DayDetailPanel
          date={selectedDay}
          transactions={selectedTransactions}
          onClose={handleClosePanel}
          onEdit={onEditTransaction || (() => {})}
          onDelete={onDeleteTransaction || (() => {})}
        />
      )}
    </div>
  );
};

export default CalendarGrid;
