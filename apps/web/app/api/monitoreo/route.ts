import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db, mensajesRecolector, extracciones, recolectores } from '@fundares/db';
import { requireAdmin } from '@/lib/session';

export async function GET() {
  const { session, error } = await requireAdmin();
  if (error || !session) return error;

  const database = db();

  const [canalStats, mensajesRows, extRows, recolectoresRows] = await Promise.all([
    // Stats per channel
    database.execute(sql`
      SELECT
        canal,
        COUNT(*)::int                        AS total_mensajes,
        COUNT(DISTINCT canal_user_id)::int   AS usuarios_unicos,
        COUNT(*) FILTER (WHERE estado = 'pendiente')::int   AS pendientes,
        COUNT(*) FILTER (WHERE estado = 'procesando')::int  AS procesando,
        COUNT(*) FILTER (WHERE estado = 'extraido')::int    AS extraidos,
        COUNT(*) FILTER (WHERE estado = 'validado')::int    AS validados,
        COUNT(*) FILTER (WHERE estado = 'rechazado')::int   AS rechazados
      FROM mensajes_recolector
      WHERE canal IS NOT NULL
      GROUP BY canal
      ORDER BY canal
    `),

    // Recent messages (last 50)
    database
      .select({
        id:             mensajesRecolector.id,
        canal:          mensajesRecolector.canal,
        canalUserId:    mensajesRecolector.canalUserId,
        contenidoTexto: mensajesRecolector.contenidoTexto,
        estado:         mensajesRecolector.estado,
        recibidoAt:     mensajesRecolector.recibidoAt,
      })
      .from(mensajesRecolector)
      .orderBy(desc(mensajesRecolector.recibidoAt))
      .limit(50),

    // Extractions with canal from joined message
    database.execute(sql`
      SELECT
        e.id,
        e.tipo_material,
        e.cantidad_kg,
        e.estado,
        e.created_at,
        m.canal,
        m.canal_user_id
      FROM extracciones e
      JOIN mensajes_recolector m ON m.id = e.mensaje_id
      ORDER BY e.created_at DESC
      LIMIT 100
    `),

    // Recolectores count per channel
    database
      .select({
        id:             recolectores.id,
        nombre:         recolectores.nombre,
        telegramChatId: recolectores.telegramChatId,
        whatsappNumber: recolectores.whatsappNumber,
        createdAt:      recolectores.createdAt,
      })
      .from(recolectores)
      .orderBy(desc(recolectores.createdAt)),
  ]);

  // Totals across all channels
  const totales = (canalStats.rows as Record<string, number>[]).reduce(
    (acc, row) => ({
      total_mensajes:  acc.total_mensajes  + (row.total_mensajes  ?? 0),
      usuarios_unicos: acc.usuarios_unicos + (row.usuarios_unicos ?? 0),
      pendientes:      acc.pendientes      + (row.pendientes      ?? 0),
      procesando:      acc.procesando      + (row.procesando      ?? 0),
      extraidos:       acc.extraidos       + (row.extraidos       ?? 0),
      validados:       acc.validados       + (row.validados       ?? 0),
      rechazados:      acc.rechazados      + (row.rechazados      ?? 0),
    }),
    { total_mensajes: 0, usuarios_unicos: 0, pendientes: 0, procesando: 0, extraidos: 0, validados: 0, rechazados: 0 },
  );

  const kgTotal = (extRows.rows as { cantidad_kg: string }[]).reduce(
    (sum, e) => sum + parseFloat(e.cantidad_kg ?? '0'), 0,
  );

  return NextResponse.json({
    canales:      canalStats.rows,
    totales:      { ...totales, kg_total: Math.round(kgTotal * 10) / 10 },
    mensajes:     mensajesRows,
    extracciones: extRows.rows,
    recolectores: recolectoresRows,
  });
}
