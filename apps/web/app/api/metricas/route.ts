import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db, empresas, recolecciones } from '@fundares/db';
import { calcularMetricas } from '@/lib/metricas';
import { requireSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error || !session) return error;

  const empresaIdParam = req.nextUrl.searchParams.get('empresa_id');
  const empresaId = empresaIdParam ?? session.user.empresaId;

  let query = db()
    .select({
      tipo_material: recolecciones.tipoMaterial,
      cantidad_kg: recolecciones.cantidadKg,
      fecha_recoleccion: recolecciones.fechaRecoleccion,
    })
    .from(recolecciones);

  if (session.user.rol === 'empresa') {
    if (!session.user.empresaId) {
      return NextResponse.json({ error: 'Empresa no asignada' }, { status: 400 });
    }
    query = query.where(eq(recolecciones.empresaId, session.user.empresaId)) as typeof query;
  } else if (empresaId) {
    query = query.where(eq(recolecciones.empresaId, empresaId)) as typeof query;
  }

  const rows = await query;
  const recoleccionesData = rows.map((row) => ({
    tipo_material: row.tipo_material,
    cantidad_kg: Number(row.cantidad_kg),
    fecha_recoleccion: row.fecha_recoleccion,
  }));

  const metricas = calcularMetricas(recoleccionesData);

  const meses: Record<string, number> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses[d.toISOString().slice(0, 7)] = 0;
  }
  for (const row of recoleccionesData) {
    const mes = row.fecha_recoleccion.slice(0, 7);
    if (mes in meses) meses[mes] += row.cantidad_kg;
  }

  const series = Object.entries(meses).map(([mes, kg]) => ({ mes, kg }));
  const distribucion: Record<string, number> = {};
  for (const row of recoleccionesData) {
    distribucion[row.tipo_material] = (distribucion[row.tipo_material] ?? 0) + row.cantidad_kg;
  }

  // Last 8 recolecciones with empresa name
  let recientesQuery = db()
    .select({
      id: recolecciones.id,
      tipo_material: recolecciones.tipoMaterial,
      cantidad_kg: recolecciones.cantidadKg,
      fecha_recoleccion: recolecciones.fechaRecoleccion,
      validado_at: recolecciones.validadoAt,
      empresa_nombre: empresas.nombre,
    })
    .from(recolecciones)
    .leftJoin(empresas, eq(recolecciones.empresaId, empresas.id));

  if (session.user.rol === 'empresa') {
    recientesQuery = recientesQuery.where(
      eq(recolecciones.empresaId, session.user.empresaId!)
    ) as typeof recientesQuery;
  } else if (empresaId) {
    recientesQuery = recientesQuery.where(
      eq(recolecciones.empresaId, empresaId)
    ) as typeof recientesQuery;
  }

  const recientesRows = await recientesQuery
    .orderBy(desc(recolecciones.validadoAt))
    .limit(8);

  return NextResponse.json({
    metricas,
    series,
    distribucion,
    recolecciones_recientes: recientesRows.map((r) => ({
      id: r.id,
      tipo_material: r.tipo_material,
      cantidad_kg: Number(r.cantidad_kg),
      fecha_recoleccion: r.fecha_recoleccion,
      validado_at: r.validado_at,
      empresa_nombre: r.empresa_nombre ?? null,
    })),
  });
}
