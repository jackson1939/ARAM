import { NextResponse } from 'next/server';
import { db, empresas, recolecciones } from '@fundares/db';
import { calcularMetricas } from '@/lib/metricas';
import { count } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [empresasRow] = await db()
    .select({ total: count() })
    .from(empresas);

  const rows = await db()
    .select({
      tipo_material:   recolecciones.tipoMaterial,
      cantidad_kg:     recolecciones.cantidadKg,
      fecha_recoleccion: recolecciones.fechaRecoleccion,
    })
    .from(recolecciones);

  const data = rows.map(r => ({
    tipo_material:    r.tipo_material,
    cantidad_kg:      Number(r.cantidad_kg),
    fecha_recoleccion: r.fecha_recoleccion,
  }));

  const metricas = calcularMetricas(data);

  return NextResponse.json({
    total_kg:      metricas.total_kg,
    co2_kg:        metricas.co2_kg,
    agua_litros:   metricas.agua_litros,
    arboles:       metricas.arboles,
    total_empresas: empresasRow?.total ?? 0,
  });
}
