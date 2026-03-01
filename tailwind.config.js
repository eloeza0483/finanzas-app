/** @type {import('tailwindcss').Config} */
export default {
  // `content` le dice a Tailwind en qué archivos buscar clases CSS.
  // Solo generará el CSS de las clases que realmente uses, reduciendo el tamaño del bundle.
  // Analogía Laravel: como el purge de Tailwind en producción con Blade.
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}", // Todos los archivos TypeScript y TSX dentro de src/
  ],
  theme: {
    extend: {
      // Aquí extenderemos el tema con colores y fuentes propias más adelante.
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

