import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import type { RegisterDto, LoginDto, AuthResponse, JwtPayload } from '../interfaces/auth.interfaces';

// =============================================================================
// services/AuthService.ts — Lógica de negocio de autenticación
// =============================================================================
// Analogía Laravel: Como AuthController + UserRepository juntos en un Service.
// Aquí vive TODA la lógica de seguridad: hashear contraseñas, firmar tokens.
// El Controlador solo valida la petición y llama a estas funciones.
// =============================================================================

// Leemos el secreto JWT desde las variables de entorno.
// Si no existe, lanzamos un error inmediatamente al arrancar.
// Esto es un "fail fast" — mejor fallar ahora que en producción.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está definido en el archivo .env');
  }
  return secret;
}

// =============================================================================
// register — Crear un nuevo usuario
// =============================================================================
export async function register(dto: RegisterDto): Promise<AuthResponse> {
  const { name, email, password } = dto;

  // Verificamos que el email no esté ya registrado.
  // En Laravel: User::where('email', $email)->exists()
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    // Lanzamos un error con código personalizado para que el controlador
    // pueda devolver 409 Conflict en lugar de 500.
    const err = new Error('Este email ya está registrado');
    (err as NodeJS.ErrnoException).code = 'EMAIL_TAKEN';
    throw err;
  }

  // Hasheamos la contraseña con bcrypt usando 12 "salt rounds".
  // Salt rounds = cuántas veces se aplica el algoritmo.
  // Más rounds = más seguro pero más lento. 12 es el estándar de la industria.
  // NUNCA guardes contraseñas en texto plano.
  const hashedPassword = await bcrypt.hash(password, 12);

  // Creamos el usuario en la BD.
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  // Firmamos el JWT con el userId, email y familyGroupId (null en registro inicial).
  // `expiresIn: '7d'` = el token expira en 7 días.
  const payload: JwtPayload = { userId: user.id, email: user.email, familyGroupId: null };
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, familyGroupId: null },
  };
}

// =============================================================================
// login — Iniciar sesión con email y contraseña
// =============================================================================
export async function login(dto: LoginDto): Promise<AuthResponse> {
  const { email, password } = dto;

  // Buscamos al usuario con su familyGroup anidado para incluir el ID en el token.
  const user = await prisma.user.findUnique({
    where: { email },
    include: { familyGroup: { select: { id: true } } },
  });

  // Si el usuario no existe O la contraseña no coincide → mismo error genérico.
  // IMPORTANTE: No decimos si fue el email o la contraseña lo incorrecto.
  // Dar esa info ayuda a atacantes a enumerar usuarios válidos.
  if (!user) {
    const err = new Error('Credenciales incorrectas');
    (err as NodeJS.ErrnoException).code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // `bcrypt.compare` compara el password en texto plano con el hash guardado.
  // Esto es seguro porque bcrypt es un hash de una sola vía.
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const err = new Error('Credenciales incorrectas');
    (err as NodeJS.ErrnoException).code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const familyGroupId = user.familyGroupId ?? null;

  // Firmamos el JWT con el familyGroupId para que el frontend lo tenga disponible.
  const payload: JwtPayload = { userId: user.id, email: user.email, familyGroupId };
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, familyGroupId },
  };
}
