import express from 'express';
import dotenv from 'dotenv';
import financeRouter from './routes/financeRoutes';
import authRouter from './routes/authRoutes';
import categoryRouter from './routes/categoryRoutes';

// =============================================================================
// index.ts — Punto de entrada del servidor Express
// =============================================================================
// Analogía Laravel: Este es tu `public/index.php` + `bootstrap/app.php` juntos.
// Es el archivo que arranca todo: configura Express, registra middlewares
// y rutas, y pone a escuchar el servidor en un puerto.
// =============================================================================

// `dotenv.config()` lee el archivo .env y expone las variables en `process.env`.
// DEBE ser la primera línea antes de importar cualquier otra cosa que use process.env.
// Analogía Laravel: Como el DotEnv que carga Laravel automáticamente.
dotenv.config();

// Creamos la app de Express. En Laravel, esto sería `$app = new Application()`.
const app = express();

// === MIDDLEWARES GLOBALES ===
// Los middlewares son funciones que se ejecutan en CADA petición, antes de
// llegar al controlador. Como los Middleware de Laravel.

// Permite que Express lea el cuerpo de peticiones con formato JSON.
// Sin esto, `req.body` estaría vacío en los POST/PUT.
// Equivale a que Laravel ya incluye por defecto al parsear JSON.
app.use(express.json());

// Permite peticiones desde el frontend (React en localhost:5173).
// CORS = Cross-Origin Resource Sharing. Sin esto, el navegador bloquea
// las peticiones del frontend al backend porque tienen puertos diferentes.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // En producción, limitar al dominio real
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next(); // `next()` = "pasa al siguiente middleware o a la ruta"
});

// Rutas de autenticación: POST /api/auth/login, POST /api/auth/register
app.use('/api/auth', authRouter);
// Rutas de categorías: GET/POST/DELETE /api/categories (requiere JWT)
app.use('/api/categories', categoryRouter);
// Rutas de finanzas: GET /api/finances/calendar
app.use('/api/finances', financeRouter);

// === RUTA DE HEALTH CHECK ===
// Ruta simple para verificar que el servidor está vivo.
// Útil para servicios de monitoreo y para pruebas rápidas.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: '🏠 Organizacion Hogar API funcionando',
  });
});

// === INICIAR EL SERVIDOR ===
const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 Health:     GET  http://localhost:${PORT}/health`);
  console.log(`🔐 Login:      POST http://localhost:${PORT}/api/auth/login`);
  console.log(`💰 Calendario: GET  http://localhost:${PORT}/api/finances/calendar\n`);
});

export default app;
