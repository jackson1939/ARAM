import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, contenidoEducativo } from '@fundares/db';
import { requireSession } from '@/lib/session';

export async function GET() {
  const { session, error } = await requireSession();
  if (error || !session) return error;

  const rows = await db()
    .select()
    .from(contenidoEducativo)
    .where(eq(contenidoEducativo.publicado, true))
    .orderBy(desc(contenidoEducativo.createdAt));

  return NextResponse.json({
    data: rows.map(r => ({
      id: r.id,
      titulo: r.titulo,
      tipo: r.tipo,
      url: r.url,
      contenido_md: r.contenidoMd,
      tags: r.tags,
    })),
  });
}
