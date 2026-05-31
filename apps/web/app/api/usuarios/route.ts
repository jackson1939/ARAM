import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db, users, perfiles } from '@fundares/db';
import { requireAdmin } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error || !session) return error;

  const body = await req.json() as {
    email?: string;
    password?: string;
    nombre?: string;
    empresa_id?: string;
  };

  if (!body.email || !body.password || !body.nombre || !body.empresa_id) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(body.password, 12);

    const [userRow] = await db()
      .insert(users)
      .values({ email: body.email, passwordHash })
      .returning();

    await db()
      .insert(perfiles)
      .values({
        id: userRow.id,
        rol: 'empresa',
        empresaId: body.empresa_id,
        nombre: body.nombre,
      });

    return NextResponse.json(
      { data: { id: userRow.id, email: userRow.email, nombre: body.nombre, empresa_id: body.empresa_id } },
      { status: 201 }
    );
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      return NextResponse.json({ error: 'Email ya registrado' }, { status: 409 });
    }
    throw err;
  }
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error || !session) return error;

  const empresa_id = req.nextUrl.searchParams.get('empresa_id');
  if (!empresa_id) {
    return NextResponse.json({ error: 'empresa_id requerido' }, { status: 400 });
  }

  const rows = await db()
    .select({
      id: users.id,
      email: users.email,
      nombre: perfiles.nombre,
      empresa_id: perfiles.empresaId,
      created_at: users.createdAt,
    })
    .from(users)
    .innerJoin(perfiles, eq(perfiles.id, users.id))
    .where(eq(perfiles.empresaId, empresa_id));

  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      email: r.email,
      nombre: r.nombre,
      empresa_id: r.empresa_id,
      created_at: r.created_at?.toISOString() ?? null,
    })),
  });
}
