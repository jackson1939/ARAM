import { count, eq, desc } from 'drizzle-orm';
import { db, empresas, extracciones, recolecciones, mensajesRecolector, recolectores } from '@fundares/db';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from '@/components/charts/BarChart';
import { calcularMetricas } from '@/lib/metricas';
import { Recycle, Building2, AlertCircle, CheckCircle, Users } from 'lucide-react';

export default async function AdminDashboardPage() {
  const database = db();

  const [
    empresaCountResult,
    recoleccionesRows,
    extraccionesRows,
    recolectoresCountResult,
    mensajesPorCanalRows,
    actividadRecienteRows,
  ] = await Promise.all([
    database.select({ value: count() }).from(empresas),
    database
      .select({
        tipo_material: recolecciones.tipoMaterial,
        cantidad_kg: recolecciones.cantidadKg,
      })
      .from(recolecciones),
    database
      .select({ estado: extracciones.estado })
      .from(extracciones)
      .limit(200),
    database.select({ value: count() }).from(recolectores),
    database
      .select({ canal: mensajesRecolector.canal, value: count() })
      .from(mensajesRecolector)
      .groupBy(mensajesRecolector.canal),
    database
      .select({
        id: extracciones.id,
        tipo_material: extracciones.tipoMaterial,
        cantidad_kg: extracciones.cantidadKg,
        fecha_recoleccion: extracciones.fechaRecoleccion,
        estado: extracciones.estado,
        confianza_ia: extracciones.confianzaIa,
        empresa_nombre: empresas.nombre,
      })
      .from(extracciones)
      .leftJoin(empresas, eq(extracciones.empresaId, empresas.id))
      .orderBy(desc(extracciones.createdAt))
      .limit(8),
  ]);

  const empresaCount = empresaCountResult[0]!;
  const recolectoresCount = recolectoresCountResult[0]!;

  const recoleccionesData = recoleccionesRows.map((row) => ({
    tipo_material: row.tipo_material,
    cantidad_kg: Number(row.cantidad_kg),
  }));

  const metricas = calcularMetricas(recoleccionesData);

  const porMaterial = Object.entries(
    recoleccionesData.reduce<Record<string, number>>((acc, row) => {
      acc[row.tipo_material] = (acc[row.tipo_material] ?? 0) + row.cantidad_kg;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }));

  const aprobadas = extraccionesRows.filter(
    (row) => row.estado === 'aprobado' || row.estado === 'corregido'
  ).length;
  const pendientes = extraccionesRows.filter((row) => row.estado === 'pendiente').length;

  // Canal stats
  const totalMensajes = mensajesPorCanalRows.reduce((sum, r) => sum + Number(r.value), 0);
  const canalStats = mensajesPorCanalRows
    .filter((r) => r.canal !== null)
    .map((r) => ({
      canal: r.canal!,
      count: Number(r.value),
      pct: totalMensajes > 0 ? Math.round((Number(r.value) / totalMensajes) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  function canalIcon(canal: string) {
    if (canal === 'telegram') return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
      </svg>
    );
    if (canal === 'whatsapp') return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    );
    if (canal === 'web') return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    );
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
      </svg>
    );
  }

  function estadoBadge(estado: string | null) {
    switch (estado) {
      case 'aprobado':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'corregido':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'rechazado':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 h-[calc(100vh-66px)] overflow-y-auto">
      {/* Row 1 — 5 metric cards */}
      <div data-tour="metric-cards" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        <MetricCard
          label="Total reciclado"
          value={`${metricas.total_kg} kg`}
          icon={Recycle}
          color="green"
        />
        <MetricCard
          label="Empresas activas"
          value={String(empresaCount.value)}
          icon={Building2}
          color="blue"
        />
        <MetricCard
          label="Recolectores"
          value={String(recolectoresCount.value)}
          icon={Users}
          color="blue"
        />
        <MetricCard
          label="Aprobadas"
          value={String(aprobadas)}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          label="Pendientes"
          value={String(pendientes)}
          icon={AlertCircle}
          color="yellow"
        />
      </div>

      {/* Row 2 — charts 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-tour="chart-materiales" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Materiales reciclados</CardTitle>
          </CardHeader>
          <CardBody>
            {porMaterial.length > 0 ? (
              <BarChart data={porMaterial} />
            ) : (
              <p className="text-sm text-body-text/70 py-8 text-center">Sin datos aún</p>
            )}
          </CardBody>
        </Card>

        <Card data-tour="canales-panel">
          <CardHeader>
            <CardTitle>Canales de entrada</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {canalStats.length === 0 ? (
              <p className="text-sm text-body-text/70 py-8 text-center">Sin datos aún</p>
            ) : (
              <>
                {canalStats.map((c) => (
                  <div key={c.canal} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-black-heading flex items-center gap-1.5">
                        {canalIcon(c.canal)}
                        <span className="capitalize">{c.canal}</span>
                      </span>
                      <span className="text-body-text font-semibold">
                        {c.count} &nbsp;
                        <span className="text-xs font-normal text-body-text/60">{c.pct}%</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-bg-page overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-[#4BAF47]"
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-body-text/60 pt-2">
                  Total: {totalMensajes} mensajes
                </p>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Row 3 — impact cards */}
      <div data-tour="impact-cards" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-[12px] border border-border-default p-4 sm:p-5 text-center bg-green-light min-w-0">
          <p className="font-black text-[#4BAF47] break-all leading-tight" style={{ fontSize: 'clamp(22px, 5vw, 30px)' }}>{metricas.co2_kg}</p>
          <p className="text-body-text text-sm mt-1">kg CO₂ evitado</p>
        </div>
        <div className="rounded-[12px] border border-border-default p-4 sm:p-5 text-center bg-bg-page min-w-0">
          <p className="font-black text-black-heading break-all leading-tight" style={{ fontSize: 'clamp(22px, 5vw, 30px)' }}>
            {metricas.agua_litros.toLocaleString()}
          </p>
          <p className="text-body-text text-sm mt-1">Agua ahorrada (L)</p>
        </div>
        <div className="rounded-[12px] border border-border-default p-4 sm:p-5 text-center bg-bg-page min-w-0">
          <p className="font-black text-black-heading break-all leading-tight" style={{ fontSize: 'clamp(22px, 5vw, 30px)' }}>{metricas.arboles}</p>
          <p className="text-body-text text-sm mt-1">Árboles equivalentes</p>
        </div>
      </div>

      {/* Row 4 — actividad reciente */}
      <Card data-tour="actividad">
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
        </CardHeader>
        <CardBody>
          {actividadRecienteRows.length === 0 ? (
            <p className="text-sm text-body-text/70 py-8 text-center">
              No hay actividad reciente aún.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default text-left text-body-text/70">
                    <th className="pb-2 pr-4 font-semibold">Empresa</th>
                    <th className="pb-2 pr-4 font-semibold">Material</th>
                    <th className="pb-2 pr-4 font-semibold">Cantidad</th>
                    <th className="pb-2 pr-4 font-semibold">Fecha</th>
                    <th className="pb-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {actividadRecienteRows.map((row) => (
                    <tr key={row.id} className="hover:bg-bg-page transition-colors">
                      <td className="py-2 pr-4 text-black-heading font-medium">
                        {row.empresa_nombre ?? '—'}
                      </td>
                      <td className="py-2 pr-4 capitalize text-body-text">
                        {row.tipo_material}
                      </td>
                      <td className="py-2 pr-4 text-body-text">
                        {Number(row.cantidad_kg).toLocaleString()} kg
                      </td>
                      <td className="py-2 pr-4 text-body-text">
                        {row.fecha_recoleccion}
                      </td>
                      <td className="py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${estadoBadge(row.estado)}`}
                        >
                          {row.estado ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
