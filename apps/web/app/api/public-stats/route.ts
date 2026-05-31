import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime  = 'nodejs';

const FALLBACK = {
  total_kg: 0, co2_kg: 0, agua_litros: 0, arboles: 0,
  total_empresas: 0, distribucion: [], recientes: [],
};

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(FALLBACK);
  }

  try {
    const { db, empresas, recolecciones } = await import('@fundares/db');
    const { calcularMetricas }            = await import('@/lib/metricas');
    const { count, desc, eq }             = await import('drizzle-orm');

    const [empresasRow] = await db()
      .select({ total: count() })
      .from(empresas);

    const rows = await db()
      .select({
        tipo_material:     recolecciones.tipoMaterial,
        cantidad_kg:       recolecciones.cantidadKg,
        fecha_recoleccion: recolecciones.fechaRecoleccion,
      })
      .from(recolecciones);

    const data = rows.map(r => ({
      tipo_material:     r.tipo_material,
      cantidad_kg:       Number(r.cantidad_kg),
      fecha_recoleccion: r.fecha_recoleccion,
    }));

    const metricas = calcularMetricas(data);

    // Distribución por material (top 5, porcentajes)
    const dist: Record<string, number> = {};
    for (const r of data) {
      dist[r.tipo_material] = (dist[r.tipo_material] ?? 0) + r.cantidad_kg;
    }
    const total = metricas.total_kg || 1;
    const distribucion = Object.entries(dist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([material, kg]) => ({
        material,
        kg:  Math.round(kg * 10) / 10,
        pct: Math.round((kg / total) * 100),
      }));

    // Últimas 3 recolecciones validadas con nombre de empresa
    const recientesRows = await db()
      .select({
        tipo_material:  recolecciones.tipoMaterial,
        cantidad_kg:    recolecciones.cantidadKg,
        empresa_id:     recolecciones.empresaId,
        empresa_nombre: empresas.nombre,
      })
      .from(recolecciones)
      .leftJoin(empresas, eq(recolecciones.empresaId, empresas.id))
      .orderBy(desc(recolecciones.validadoAt))
      .limit(3);

    const recientes = recientesRows.map(r => ({
      empresa:  r.empresa_nombre ?? r.empresa_id ?? '—',
      initials: (r.empresa_nombre ?? r.empresa_id ?? '??').slice(0, 2).toUpperCase(),
      kg:       `${Number(r.cantidad_kg).toLocaleString()} kg`,
      material: r.tipo_material,
    }));

    return NextResponse.json({
      total_kg:       metricas.total_kg,
      co2_kg:         metricas.co2_kg,
      agua_litros:    metricas.agua_litros,
      arboles:        metricas.arboles,
      total_empresas: empresasRow?.total ?? 0,
      distribucion,
      recientes,
    });
  } catch (err) {
    console.error('[public-stats]', err);
    return NextResponse.json(FALLBACK);
  }
}
