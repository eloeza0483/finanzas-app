import React from 'react';
import { useMonthSummary } from '../hooks/useMonthSummary';

interface MonthSummaryCardProps {
  month: string; // "YYYY-MM"
  refreshTrigger: number;
}

const MonthSummaryCard: React.FC<MonthSummaryCardProps> = ({ month, refreshTrigger }) => {
  const { summary, isLoading, error } = useMonthSummary(month, refreshTrigger);

  // Mientras carga o hay error, mostramos esqueletos/mensajes amigables
  if (isLoading) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 animate-pulse w-full max-w-2xl mx-auto mb-6">
        <div className="h-4 bg-slate-800 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-slate-800 rounded w-1/2 mb-6"></div>
        <div className="flex gap-4">
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-rose-950/30 border border-rose-900/50 rounded-2xl p-6 mb-6 text-center max-w-2xl mx-auto">
        <p className="text-sm text-rose-400">No se pudo cargar el resumen del mes.</p>
      </div>
    );
  }

  const { totalIncome, totalExpense, balance } = summary;

  // Formateador de moneda (MXN)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  // Cálculo visual de la barra de progreso
  // ¿Qué porcentaje de mis ingresos ya me gasté?
  // Min: 0%, Max: 100% (para no salirnos de la barra)
  let expensePercentage = 0;
  if (totalIncome > 0) {
    expensePercentage = Math.min((totalExpense / totalIncome) * 100, 100);
  } else if (totalExpense > 0) {
    // Si no hay ingresos pero sí gastos, la barra está full.
    expensePercentage = 100;
  }

  // Determinamos colores de la barra. 
  // Si gané más que gastar: Verde.
  // Si ya gasté más de lo que gané (> 90%): Rojo/Naranja.
  let progressBarColor = 'bg-emerald-500';
  if (expensePercentage > 90) progressBarColor = 'bg-rose-500';
  else if (expensePercentage > 75) progressBarColor = 'bg-orange-500';

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-6 mb-6 shadow-xl max-w-2xl mx-auto w-full">
      <div className="flex flex-col gap-6">
        
        {/* Superior: Título y Balance Principal */}
        <div className="text-center">
          <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-2">Balance Total</h2>
          <div className={`text-4xl sm:text-5xl font-bold tracking-tight ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(balance)}
          </div>
        </div>

        {/* Medio: Barra de "Presupuesto/Gasto" */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-medium text-slate-500">
            <span>Progreso de Gastos</span>
            <span>{expensePercentage.toFixed(0)}%</span>
          </div>
          {/* Fondo de la barra */}
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            {/* Relleno animado basado en el % de gasto */}
            <div 
              className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${progressBarColor}`}
              style={{ width: `${expensePercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Inferior: Ingresos vs Gastos en Columnas */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/50">
          
          {/* Ingresos */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 h-10 w-10 text-xl rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              ⬆️
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Ingresos</p>
              <p className="text-base font-semibold text-slate-200">{formatCurrency(totalIncome)}</p>
            </div>
          </div>

          {/* Gastos */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 h-10 w-10 text-xl rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
              ⬇️
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Gastos</p>
              <p className="text-base font-semibold text-slate-200">{formatCurrency(totalExpense)}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default MonthSummaryCard;
