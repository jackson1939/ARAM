#!/usr/bin/env node
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Helper to load and parse .env files if they exist (without external dependencies)
const loadEnv = (filePath) => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      
      const parts = trimmed.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let val = parts.slice(1).join('=').trim();
        
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        
        // Always overwrite process.env to ignore stale environment variables from the shell
        process.env[key] = val;
      }
    });
  }
};

// Load environment files from lowest to highest priority
loadEnv(path.resolve('apps/web/.env'));
loadEnv(path.resolve('apps/web/.env.local'));
loadEnv(path.resolve('.env'));
loadEnv(path.resolve('.env.local'));

const email = (process.env.ADMIN_EMAIL ?? 'admin@fundares.org').toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? 'Admin123!';
const nombre = process.env.ADMIN_NAME ?? 'Administrador';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(databaseUrl);
const passwordHash = await bcrypt.hash(password, 12);

console.log('Bootstrapping database tables if they do not exist...');
try {
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
  
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email         text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      created_at    timestamptz DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS empresas (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre        text NOT NULL,
      logo_url      text,
      contacto_email text,
      created_at    timestamptz DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS perfiles (
      id         uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      rol        text NOT NULL CHECK (rol IN ('admin', 'empresa')),
      empresa_id uuid REFERENCES empresas(id) ON DELETE SET NULL,
      nombre     text
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS mensajes_recolector (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contenido_texto text,
      fotos_urls      text[],
      recibido_at     timestamptz DEFAULT now(),
      estado          text DEFAULT 'pendiente'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS extracciones (
      id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      mensaje_id          uuid REFERENCES mensajes_recolector(id) ON DELETE CASCADE,
      empresa_id          uuid REFERENCES empresas(id) ON DELETE CASCADE,
      tipo_material       text NOT NULL,
      cantidad_kg         numeric NOT NULL,
      fecha_recoleccion   date NOT NULL,
      confianza_ia        numeric,
      datos_raw           jsonb,
      estado              text DEFAULT 'pendiente',
      corregido_por       uuid REFERENCES users(id),
      created_at          timestamptz DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS recolecciones (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      extraccion_id     uuid REFERENCES extracciones(id) ON DELETE SET NULL,
      empresa_id        uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
      tipo_material     text NOT NULL,
      cantidad_kg       numeric NOT NULL,
      fecha_recoleccion date NOT NULL,
      validado_por      uuid REFERENCES users(id),
      validado_at       timestamptz DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS contenido_educativo (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      titulo       text NOT NULL,
      tipo         text,
      url          text,
      contenido_md text,
      tags         text[],
      publicado    boolean DEFAULT false,
      created_at   timestamptz DEFAULT now()
    )
  `;
  console.log('Database tables successfully created or verified.');
} catch (error) {
  console.error('Error bootstrapping database tables:', error);
  process.exit(1);
}

const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;

if (existing.length > 0) {
  const userId = existing[0].id;
  console.log(`Admin user already exists: ${email}. Updating password and profile...`);
  
  await sql`
    UPDATE users
    SET password_hash = ${passwordHash}
    WHERE id = ${userId}
  `;
  
  const profile = await sql`SELECT rol FROM perfiles WHERE id = ${userId} LIMIT 1`;
  if (profile.length === 0) {
    await sql`
      INSERT INTO perfiles (id, rol, nombre)
      VALUES (${userId}, 'admin', ${nombre})
    `;
  } else {
    await sql`
      UPDATE perfiles
      SET rol = 'admin', nombre = ${nombre}
      WHERE id = ${userId}
    `;
  }
  
  console.log('Admin user updated successfully');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  process.exit(0);
}

const users = await sql`
  INSERT INTO users (email, password_hash)
  VALUES (${email}, ${passwordHash})
  RETURNING id
`;

const userId = users[0].id;

await sql`
  INSERT INTO perfiles (id, rol, nombre)
  VALUES (${userId}, 'admin', ${nombre})
`;

console.log('Admin user created successfully');
console.log(`Email: ${email}`);
console.log(`Password: ${password}`);

// ── Demo empresa user ─────────────────────────────────────────────────────────

const demoEmpresaEmail    = 'empresa@demo.com';
const demoEmpresaPassword = '12345';
const demoEmpresaNombre   = 'Empresa Demo';

const demoEmpresaPasswordHash = await bcrypt.hash(demoEmpresaPassword, 12);

const existingDemoEmpresa = await sql`SELECT id FROM users WHERE email = ${demoEmpresaEmail} LIMIT 1`;

if (existingDemoEmpresa.length > 0) {
  const demoUserId = existingDemoEmpresa[0].id;
  console.log(`\nDemo empresa user already exists: ${demoEmpresaEmail}. Updating password...`);
  await sql`UPDATE users SET password_hash = ${demoEmpresaPasswordHash} WHERE id = ${demoUserId}`;
  console.log('Demo empresa user updated.');
} else {
  // Create demo empresa
  const [demoEmpresa] = await sql`
    INSERT INTO empresas (nombre, contacto_email)
    VALUES (${demoEmpresaNombre}, ${demoEmpresaEmail})
    ON CONFLICT DO NOTHING
    RETURNING id
  `;

  let demoEmpresaId = demoEmpresa?.id;
  if (!demoEmpresaId) {
    const [existing] = await sql`SELECT id FROM empresas WHERE nombre = ${demoEmpresaNombre} LIMIT 1`;
    demoEmpresaId = existing?.id;
  }

  // Create demo user
  const [demoUser] = await sql`
    INSERT INTO users (email, password_hash)
    VALUES (${demoEmpresaEmail}, ${demoEmpresaPasswordHash})
    RETURNING id
  `;

  await sql`
    INSERT INTO perfiles (id, rol, empresa_id, nombre)
    VALUES (${demoUser.id}, 'empresa', ${demoEmpresaId}, ${demoEmpresaNombre})
  `;

  console.log(`\nDemo empresa user created:`);
  console.log(`  Email:    ${demoEmpresaEmail}`);
  console.log(`  Password: ${demoEmpresaPassword}`);
  console.log(`  Empresa:  ${demoEmpresaNombre}`);
}
