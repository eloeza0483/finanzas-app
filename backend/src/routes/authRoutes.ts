import { Router } from 'express';
import { handleLogin, handleRegister } from '../controllers/AuthController';

// =============================================================================
// routes/authRoutes.ts
// Montado en: /api/auth
// POST /api/auth/register → crear cuenta
// POST /api/auth/login    → iniciar sesión
// =============================================================================
const authRouter = Router();

authRouter.post('/register', handleRegister);
authRouter.post('/login', handleLogin);

export default authRouter;
