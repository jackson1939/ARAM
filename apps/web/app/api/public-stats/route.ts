import { NextResponse } from 'next/server';
import { count } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  // DATABASE_URL not available at build time — return empty fallback
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ total_kg: 0, co2_kg: 0, agua_litros: 0, arboles: 0, total_empresas: 0 });
  }

  const { db, empresas, recolecciones } = await import('@fundares/db');
  const { calcularMetricas } = await import('@/lib/metricas');

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

  return NextResponse.json({
    total_kg:       metricas.total_kg,
    co2_kg:         metricas.co2_kg,
    agua_litros:    metricas.agua_litros,
    arboles:        metricas.arboles,
    total_empresas: empresasRow?.total ?? 0,
  });
}
