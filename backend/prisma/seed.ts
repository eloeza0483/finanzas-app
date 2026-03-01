import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// =============================================================================
// prisma/seed.ts — Script de datos iniciales
// =============================================================================
// Este script crea los datos base que necesitamos para que la app funcione:
//   1. FamilyGroup "Casa Ernesto & Monse"
//   2. Usuario Ernesto
//   3. Usuario Monse
//   4. Categorías base
//
// Cómo correrlo: npm run db:seed
// Analogía Laravel: Como php artisan db:seed con un DatabaseSeeder.
// =============================================================================

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Iniciando seed de la base de datos...\n');

  // --- 1. Crear el Grupo Familiar ---
  // `upsert` = "crea este registro, pero si ya existe actualízalo".
  // Es idempotente: puedes correr el seed múltiples veces sin duplicar datos.
  // En Laravel: User::updateOrCreate([...])
  const familyGroup = await prisma.familyGroup.upsert({
    where: { id: 'family-group-ernesto-monse' },
    update: { name: 'Casa Ernesto & Monse' },
    create: {
      id: 'family-group-ernesto-monse',
      name: 'Casa Ernesto & Monse',
    },
  });
  console.log(`✅ FamilyGroup creado: "${familyGroup.name}" (${familyGroup.id})`);

  // --- 2. Hashear contraseñas ---
  const passwordHash = await bcrypt.hash('password123', 12);

  // --- 3. Crear Usuario Ernesto ---
  const ernesto = await prisma.user.upsert({
    where: { email: 'ernesto@hogar.com' },
    update: { familyGroupId: familyGroup.id },
    create: {
      id: 'user-ernesto',
      name: 'Ernesto',
      email: 'ernesto@hogar.com',
      password: passwordHash,
      familyGroupId: familyGroup.id,
    },
  });
  console.log(`✅ Usuario creado: ${ernesto.name} (${ernesto.email})`);

  // --- 4. Crear Usuaria Monse ---
  const monse = await prisma.user.upsert({
    where: { email: 'monse@hogar.com' },
    update: { familyGroupId: familyGroup.id },
    create: {
      id: 'user-monse',
      name: 'Monse',
      email: 'monse@hogar.com',
      password: passwordHash,
      familyGroupId: familyGroup.id,
    },
  });
  console.log(`✅ Usuario creado: ${monse.name} (${monse.email})`);

  // --- 5. Crear Categorías base ---
  const categories = [
    { id: 'cat-despensa',       name: 'Despensa',       icon: '🛒', color: '#3b82f6' },
    { id: 'cat-renta',          name: 'Renta/Hipoteca', icon: '🏠', color: '#f97316' },
    { id: 'cat-servicios',      name: 'Servicios',      icon: '💡', color: '#eab308' },
    { id: 'cat-mascotas',       name: 'Mascotas',       icon: '🐾', color: '#a855f7' },
    { id: 'cat-restaurantes',   name: 'Restaurantes',   icon: '🍽️', color: '#06b6d4' },
    { id: 'cat-salud',          name: 'Salud',          icon: '💊', color: '#10b981' },
    { id: 'cat-entretenimiento',name: 'Entretenimiento',icon: '🎬', color: '#ef4444' },
    { id: 'cat-transporte',     name: 'Transporte',     icon: '🚗', color: '#8b5cf6' },
    { id: 'cat-sueldo',         name: 'Sueldo',         icon: '💼', color: '#22c55e' },
    { id: 'cat-otros',          name: 'Otros',          icon: '📦', color: '#6b7280' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: { ...cat, familyGroupId: familyGroup.id },
    });
  }
  console.log(`✅ ${categories.length} categorías creadas\n`);

  console.log('🏠 Seed completado. ¡La app está lista!\n');
  console.log('📧 Credenciales de acceso:');
  console.log('   Ernesto → ernesto@hogar.com / password123');
  console.log('   Monse   → monse@hogar.com   / password123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
