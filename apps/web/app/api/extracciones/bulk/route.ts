import { NextRequest, NextResponse } from 'next/server';
import { db, extracciones, mensajesRecolector } from '@fundares/db';
import { requireSession } from '@/lib/session';

interface BulkRow {
  fecha: string;
  tipo_material: string;
  cantidad_kg: number;
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error || !session) return error;

  if (session.user.rol !== 'empresa' || !session.user.empresaId) {
    return NextResponse.json({ error: 'Solo disponible para empresas' }, { status: 403 });
  }

  const body = await req.json() as { filas: BulkRow[] };

  if (!Array.isArray(body.filas) || body.filas.length === 0) {
    return NextResponse.json({ error: 'Sin filas válidas' }, { status: 400 });
  }

  if (body.filas.length > 500) {
    return NextResponse.json({ error: 'Máximo 500 filas por carga' }, { status: 400 });
  }

  const [mensaje] = await db()
    .insert(mensajesRecolector)
    .values({
      contenidoTexto: `Carga masiva: ${body.filas.length} recolecciones`,
      estado: 'extraido',
      canal: 'web',
      canalUserId: session.user.id,
    })
    .returning({ id: mensajesRecolector.id });

  let ok = 0;
  let errors = 0;

  await Promise.all(
    body.filas.map(async (fila) => {
      try {
        await db().insert(extracciones).values({
          mensajeId: mensaje!.id,
          empresaId: session.user.empresaId!,
          tipoMaterial: fila.tipo_material,
          cantidadKg: String(fila.cantidad_kg),
          fechaRecoleccion: fila.fecha,
          confianzaIa: '0.95',
          estado: 'pendiente',
        });
        ok++;
      } catch {
        errors++;
      }
    })
  );

  return NextResponse.json({ ok, errors }, { status: 201 });
}
