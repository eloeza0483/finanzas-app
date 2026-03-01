import { PrismaClient } from '@prisma/client';

// =============================================================================
// lib/prisma.ts — Singleton del Prisma Client
// =============================================================================
// Problema: Si creamos `new PrismaClient()` en cada archivo que lo necesite,
// Node.js abriría múltiples conexiones a la BD. Esto es un problema grave.
//
// Solución: El patrón Singleton — solo existe UNA instancia de PrismaClient
// en toda la aplicación, y todos los módulos la comparten.
//
// Analogía Laravel: Como la fachada `DB::` de Laravel — no instancias
// una nueva conexión cada vez, usas la conexión global del framework.
// =============================================================================

// `declare global` extiende el tipo global de Node.js para incluir nuestra
// variable `prisma`. Esto es necesario para hacer funcionar el singleton
// en modo desarrollo (donde ts-node-dev recarga el módulo en cada cambio).
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// En producción: crea una instancia nueva.
// En desarrollo: reutiliza la instancia guardada en `global.prisma` para
// evitar crear cientos de conexiones cuando el hot-reload recarga el módulo.
const prisma = global.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'], // Muestra en consola cada SQL que se ejecuta (útil para aprender)
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
