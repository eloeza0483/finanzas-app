import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../interfaces/auth.interfaces';

// =============================================================================
// middleware/authMiddleware.ts — Verificación de JWT
// =============================================================================
// Analogía Laravel: Como el middleware `auth:sanctum` o `auth:api`.
// Se ejecuta ANTES del controlador y verifica que el token sea válido.
//
// Flujo:
//   Request → authMiddleware (verifica JWT) → Controlador (lógica)
//   Si el JWT es inválido → 401 Unauthorized (el controlador nunca se ejecuta)
// =============================================================================

// Extendemos el tipo de `Request` de Express para agregar el usuario autenticado.
// Sin esto, TypeScript no sabría que `req.user` existe y lanzaría un error.
// Analogía Laravel: Como cuando accedes a `auth()->user()` en un controlador.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // El token viene en el header: `Authorization: Bearer eyJhbGci...`
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticación requerido' });
    return;
  }

  // Extraemos solo el token (sin "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET ?? '';
    // `jwt.verify` valida la firma y la expiración del token.
    // Si el token fue manipulado o expiró → lanza JsonWebTokenError.
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Adjuntamos el payload del JWT al request para que los controladores lo usen.
    req.user = decoded;

    // `next()` = "pasá al siguiente middleware o al controlador"
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
