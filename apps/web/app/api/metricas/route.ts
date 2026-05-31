import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { db, empresas, recolecciones } from '@fundares/db';
import { calcularMetricas } from '@/lib/metricas';
import { requireSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error || !session) return error;

  const p = req.nextUrl.searchParams;
  const empresaIdParam = p.get('empresa_id');
  const empresaId      = empresaIdParam ?? session.user.empresaId;
  const desde          = p.get('desde');   // YYYY-MM-DD
  const hasta          = p.get('hasta');   // YYYY-MM-DD

  // Build empresa + date filter conditions
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.rol === 'empresa' && !session.user.empresaId) {
    return NextResponse.json({ error: 'Empresa no asignada' }, { status: 400 });
  }

  function buildWhere() {
    const conds = [];
    if (session!.user.rol === 'empresa') {
      conds.push(eq(recolecciones.empresaId, session!.user.empresaId!));
    } else if (empresaId) {
      conds.push(eq(recolecciones.empresaId, empresaId));
    }
    if (desde) conds.push(gte(recolecciones.fechaRecoleccion, desde));
    if (hasta) conds.push(lte(recolecciones.fechaRecoleccion, hasta));
    return conds.length > 0 ? and(...conds) : undefined;
  }

  const where = buildWhere();

  const rows = await (where
    ? db().select({ tipo_material: recolecciones.tipoMaterial, cantidad_kg: recolecciones.cantidadKg, fecha_recoleccion: recolecciones.fechaRecoleccion }).from(recolecciones).where(where)
    : db().select({ tipo_material: recolecciones.tipoMaterial, cantidad_kg: recolecciones.cantidadKg, fecha_recoleccion: recolecciones.fechaRecoleccion }).from(recolecciones)
  );

  const recoleccionesData = rows.map(r => ({ tipo_material: r.tipo_material, cantidad_kg: Number(r.cantidad_kg), fecha_recoleccion: r.fecha_recoleccion }));
  const metricas = calcularMetricas(recoleccionesData);

  // Monthly series (last 12 months)
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

  // Recent recolecciones with empresa name
  const recientesRows = await (where
    ? db().select({ id: recolecciones.id, tipo_material: recolecciones.tipoMaterial, cantidad_kg: recolecciones.cantidadKg, fecha_recoleccion: recolecciones.fechaRecoleccion, validado_at: recolecciones.validadoAt, empresa_nombre: empresas.nombre }).from(recolecciones).leftJoin(empresas, eq(recolecciones.empresaId, empresas.id)).where(where).orderBy(desc(recolecciones.validadoAt)).limit(50)
    : db().select({ id: recolecciones.id, tipo_material: recolecciones.tipoMaterial, cantidad_kg: recolecciones.cantidadKg, fecha_recoleccion: recolecciones.fechaRecoleccion, validado_at: recolecciones.validadoAt, empresa_nombre: empresas.nombre }).from(recolecciones).leftJoin(empresas, eq(recolecciones.empresaId, empresas.id)).orderBy(desc(recolecciones.validadoAt)).limit(50)
  );

  return NextResponse.json({
    metricas,
    series,
    distribucion,
    recolecciones_recientes: recientesRows.map(r => ({
      id: r.id,
      tipo_material: r.tipo_material,
      cantidad_kg: Number(r.cantidad_kg),
      fecha_recoleccion: r.fecha_recoleccion,
      validado_at: r.validado_at,
      empresa_nombre: r.empresa_nombre ?? null,
    })),
  });
}
