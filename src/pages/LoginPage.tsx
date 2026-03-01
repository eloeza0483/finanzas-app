import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { loginUser } from '../services/authService';

// =============================================================================
// pages/LoginPage.tsx — Pantalla de inicio de sesión
// =============================================================================
// Diseño premium dark mode con glassmorphism.
// Mobile-First: se ve perfecto en el celular de Ernesto y Monse.
// =============================================================================

const LoginPage: React.FC = () => {
  // Campos del formulario — cada `useState` es como una variable de PHP en el form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Consumimos el contexto para poder llamar a `login()` tras un login exitoso
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    // `preventDefault()` evita que el formulario recargue la página
    // (comportamiento por defecto del HTML — mismo problema que en Laravel con form sin @csrf)
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Llamamos al servicio que hace fetch al backend
      const response = await loginUser({ email, password });
      // Si llega aquí, el login fue exitoso — guardamos en el contexto
      login(response.user, response.token);
      // El App.tsx detectará `isAuthenticated = true` y mostrará el calendario
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para autorellenar credenciales de prueba (útil para desarrollo)
  const fillCredentials = (user: 'ernesto' | 'monse') => {
    setEmail(user === 'ernesto' ? 'ernesto@hogar.com' : 'monse@hogar.com');
    setPassword('password123');
    setError(null);
  };

  return (
    // Fondo con gradiente radial — le da profundidad al diseño
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Círculos decorativos de fondo — efecto "glow" */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

      {/* Logo + título */}
      <div className="flex flex-col items-center mb-8 z-10">
        <div className="text-5xl mb-3">🏠</div>
        <h1 className="text-2xl font-bold text-slate-100">Organización Hogar</h1>
        <p className="text-slate-500 text-sm mt-1">Ernesto & Monse</p>
      </div>

      {/* Card del formulario — glassmorphism */}
      <div className="w-full max-w-sm z-10">
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-2xl">

          <h2 className="text-lg font-semibold text-slate-100 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Campo Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                // `autoComplete` ayuda al navegador a autorellenar en el celular
                autoComplete="email"
                className="
                  w-full rounded-xl border border-slate-600/50 bg-slate-900/60
                  px-4 py-3 text-sm text-slate-100 placeholder-slate-600
                  outline-none transition-all duration-200
                  focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
                "
              />
            </div>

            {/* Campo Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="
                    w-full rounded-xl border border-slate-600/50 bg-slate-900/60
                    px-4 py-3 pr-12 text-sm text-slate-100 placeholder-slate-600
                    outline-none transition-all duration-200
                    focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-lg"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3">
                <span className="text-rose-400 text-lg">⚠️</span>
                <p className="text-sm text-rose-300">{error}</p>
              </div>
            )}

            {/* Botón de submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="
                w-full rounded-xl bg-violet-600 hover:bg-violet-500
                disabled:opacity-50 disabled:cursor-not-allowed
                py-3 text-sm font-semibold text-white
                transition-all duration-200 active:scale-[0.98]
                flex items-center justify-center gap-2
              "
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar →'
              )}
            </button>
          </form>
        </div>

        {/* Acceso rápido para desarrollo — solo visible aquí en local */}
        <div className="mt-4 bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
          <p className="text-xs text-slate-500 text-center mb-3 font-medium">ACCESO RÁPIDO (DESARROLLO)</p>
          <div className="flex gap-2">
            <button
              onClick={() => fillCredentials('ernesto')}
              className="flex-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 border border-slate-600/30 py-2 text-xs text-slate-300 transition-colors"
            >
              🧔 Ernesto
            </button>
            <button
              onClick={() => fillCredentials('monse')}
              className="flex-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 border border-slate-600/30 py-2 text-xs text-slate-300 transition-colors"
            >
              👩 Monse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
