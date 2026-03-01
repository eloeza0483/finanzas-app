import { Request, Response } from 'express';
import { login, register } from '../services/AuthService';
import type { LoginDto, RegisterDto } from '../interfaces/auth.interfaces';

// =============================================================================
// controllers/AuthController.ts
// =============================================================================
// Analogía Laravel: App\Http\Controllers\AuthController
// Solo valida HTTP, llama al service, y mapea errores a status codes.
// =============================================================================

// POST /api/auth/register
export async function handleRegister(req: Request, res: Response): Promise<void> {
  try {
    const dto: RegisterDto = req.body;

    // Validación básica de campos requeridos
    if (!dto.name || !dto.email || !dto.password) {
      res.status(400).json({ error: 'name, email y password son requeridos' });
      return;
    }
    if (dto.password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const result = await register(dto);
    // 201 Created = recurso creado exitosamente (diferente a 200 OK)
    res.status(201).json(result);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EMAIL_TAKEN') {
      res.status(409).json({ error: err.message }); // 409 Conflict
      return;
    }
    console.error('[AuthController] Error en register:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// POST /api/auth/login
export async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    const dto: LoginDto = req.body;

    if (!dto.email || !dto.password) {
      res.status(400).json({ error: 'email y password son requeridos' });
      return;
    }

    const result = await login(dto);
    res.status(200).json(result);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'INVALID_CREDENTIALS') {
      // 401 Unauthorized = credenciales inválidas
      res.status(401).json({ error: err.message });
      return;
    }
    console.error('[AuthController] Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
