import './index.css';
import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import CalendarGrid from './components/CalendarGrid';
import LoginPage from './pages/LoginPage';
import TransactionForm from './components/TransactionForm';
import type { TransactionFormData } from './components/TransactionForm';
import { createTransaction, deleteTransaction, updateTransaction } from './services/financeService';
import type { TransactionDto } from './interfaces/finance.interfaces';
import { CategoryManager } from './components/CategoryManager';

// =============================================================================
// App.tsx — Raíz de la app con auth guard + modal de nueva transacción
// =============================================================================

function AppContent() {
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  // Controla si el modal del formulario está abierto
  const [showForm, setShowForm] = useState(false);
  // Controla si estamos enviando la transacción al backend
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Controla si el modal del gestor de categorías está abierto
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  // Transacción seleccionada para editar (null = creando nueva)
  const [selectedTransactionForEdit, setSelectedTransactionForEdit] = useState<TransactionDto | null>(null);
  // Disparador para refrescar el calendario tras guardar o eliminar
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Spinner mientras se verifica la sesión en localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  // 2. Si no hay sesión → pantalla de login
  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  // Guarda o actualiza la transacción en PostgreSQL y refresca el calendario
  const handleFormSubmit = async (data: TransactionFormData) => {
    // Seguridad adicional: nunca debería pasar, pero TypeScript lo agradece
    if (!token) return;

    setIsSubmitting(true);
    try {
      if (selectedTransactionForEdit) {
        // Modo Edición: Enviamos los datos actualizados al backend
        await updateTransaction({
          id: selectedTransactionForEdit.id,
          data,
          token
        });
      } else {
        // Modo Creación: Enviamos los datos nuevos al backend
        await createTransaction({ data, token });
      }
      
      // Cerramos el modal
      setShowForm(false);
      // Limpiamos el estado de edición por si acaso
      setSelectedTransactionForEdit(null);
      
      // Forzamos al calendario a recargar los datos
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error('Error al guardar la transacción:', error);
      alert('Hubo un error al guardar. Por favor, intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (tx: TransactionDto) => {
    // Al tocar "editar", guardamos la transacción en el estado y abrimos el modal
    setSelectedTransactionForEdit(tx);
    setShowForm(true);
  };

  const handleDeleteClick = async (tx: TransactionDto) => {
    if (!token) return;

    // Confirmación nativa simple y efectiva
    const confirmDelete = window.confirm(`¿Estás seguro de eliminar el registro "${tx.title}"?`);
    if (!confirmDelete) return;

    try {
      await deleteTransaction({ id: tx.id, token });
      // Refrescamos la vista
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('No se pudo eliminar el registro. Intenta de nuevo.');
    }
  };

  // 3. App principal con calendario + FAB + modal
  return (
    <div className="min-h-screen bg-slate-950">

      {/* Header */}
      <header className="border-b border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏠</span>
            <div>
              <h1 className="text-base font-bold text-slate-100 leading-none">Organización Hogar</h1>
              <p className="text-xs text-slate-500">Ernesto &amp; Monse</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:block">
              Hola, <span className="font-medium text-slate-200">{user.name}</span> 👋
            </span>
            {/* Botón de Configuración/Categorías */}
            <button
              onClick={() => setShowCategoryManager(true)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
              aria-label="Administrar categorías"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={logout}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Calendario */}
      <main>
        <CalendarGrid 
          refreshTrigger={refreshTrigger}
          onEditTransaction={handleEditClick}
          onDeleteTransaction={handleDeleteClick}
        />
      </main>

      {/* FAB — Floating Action Button para abrir el formulario EN MODO CREACIÓN */}
      <button
        onClick={() => {
          setSelectedTransactionForEdit(null);
          setShowForm(true);
        }}
        aria-label="Agregar transacción"
        className="
          fixed bottom-6 right-6 z-30
          h-14 w-14 rounded-full
          bg-violet-600 hover:bg-violet-500 active:scale-95
          shadow-lg shadow-violet-900/40
          text-white text-2xl font-light
          transition-all duration-200
          flex items-center justify-center
        "
      >
        +
      </button>

      {/* MODAL — bottom sheet en móvil, dialog centrado en desktop */}
      {showForm && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto">
            {/* Handle visual (solo móvil) */}
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-700 sm:hidden" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-100">
                {selectedTransactionForEdit ? 'Editar transacción' : 'Nueva transacción'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {/*
              TransactionForm llama a useCategories() internamente.
              Al montar el modal, el hook hace fetch a GET /api/categories con el JWT
              y rellena el <select> con las categorías reales de PostgreSQL.
            */}
              <TransactionForm
                onSubmit={handleFormSubmit}
                onCancel={() => setShowForm(false)}
                isSubmitting={isSubmitting}
                initialData={selectedTransactionForEdit || undefined}
              />
          </div>
        </div>
      )}

      {/* MODAL — Gestor de Categorías */}
      {showCategoryManager && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCategoryManager(false); }}
        >
          {/* El contenedor principal. Usamos max-h-[90vh] para que no se salga de la pantalla en móvil
              y overflow-y-auto para que se pueda scrollear si hay muchas categorías. */}
          <div className="relative w-full max-w-lg bg-slate-50 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header del modal fijo arriba */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white z-10 sticky top-0">
              <h2 className="text-lg font-bold text-slate-800">Ajustes</h2>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Cerrar ajustes"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido scrolleable. Le quitamos los paddings arriba a CategoryManager
                porque ya tenemos el header aquí. */}
            <div className="overflow-y-auto flex-1 p-2">
              <CategoryManager />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
