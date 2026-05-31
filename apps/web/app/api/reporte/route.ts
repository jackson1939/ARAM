import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, lte } from 'drizzle-orm';
import { db, empresas, recolecciones } from '@fundares/db';
import { generarReportePDF } from '@/lib/pdf';
import { requireSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error || !session) return error;

  const p          = req.nextUrl.searchParams;
  const empresaId  = p.get('empresa_id') ?? session.user.empresaId;
  const anio       = parseInt(p.get('anio') ?? String(new Date().getFullYear()), 10);
  const desdeParam = p.get('desde');
  const hastaParam = p.get('hasta');
  const desde      = desdeParam ?? `${anio}-01-01`;
  const hasta      = hastaParam ?? `${anio}-12-31`;

  if (!empresaId) return NextResponse.json({ error: 'empresa_id required' }, { status: 400 });
  if (session.user.rol === 'empresa' && session.user.empresaId !== empresaId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [empresaRow] = await db()
    .select()
    .from(empresas)
    .where(eq(empresas.id, empresaId))
    .limit(1);

  const recoleccionesRows = await db()
    .select()
    .from(recolecciones)
    .where(
      and(
        eq(recolecciones.empresaId, empresaId),
        gte(recolecciones.fechaRecoleccion, desde),
        lte(recolecciones.fechaRecoleccion, hasta),
      )
    );

  if (!empresaRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const empresa = {
    id: empresaRow.id,
    nombre: empresaRow.nombre,
    logo_url: empresaRow.logoUrl,
    contacto_email: empresaRow.contactoEmail,
    created_at: empresaRow.createdAt?.toISOString() ?? '',
  };

  const recoleccionesData = recoleccionesRows.map((row) => ({
    id: row.id,
    extraccion_id: row.extraccionId,
    empresa_id: row.empresaId,
    tipo_material: row.tipoMaterial,
    cantidad_kg: Number(row.cantidadKg),
    fecha_recoleccion: row.fechaRecoleccion,
    validado_por: row.validadoPor,
    validado_at: row.validadoAt?.toISOString() ?? '',
  }));

  const pdfBytes = await generarReportePDF(empresa, recoleccionesData, anio);

  return new NextResponse(pdfBytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-${empresa.nombre}-${anio}.pdf"`,
    },
  });
}
