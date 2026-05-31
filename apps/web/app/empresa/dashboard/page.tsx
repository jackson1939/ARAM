'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart } from '@/components/charts/LineChart';
import { PieChart } from '@/components/charts/PieChart';
import { Recycle, Droplets, TreePine, Wind } from 'lucide-react';
import type { MetricasImpacto } from '@/types';
import { TipsPersonalizados } from '@/components/TipsPersonalizados';

const MAT_COLOR: Record<string, string> = {
  plastico: 'var(--mat-plastico)', plastico_sin_tilde: 'var(--mat-plastico)',
  papel: 'var(--mat-papel)',
  vidrio: 'var(--mat-vidrio)',
  metal: 'var(--mat-metal)',
  carton: 'var(--mat-carton)', carton_sin_tilde: 'var(--mat-carton)',
  electronico: 'var(--mat-electronico)', electronico_sin_tilde: 'var(--mat-electronico)',
  organico: 'var(--mat-organico)', organico_sin_tilde: 'var(--mat-organico)',
};
function matColor(m: string) {
  const key = m.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return MAT_COLOR[key] ?? 'var(--green)';
}

interface Recoleccion {
  id: string;
  tipo_material: string;
  cantidad_kg: number;
  fecha_recoleccion: string;
  validado_at: string | null;
  empresa_nombre?: string | null;
}

interface DashData {
  metricas: MetricasImpacto;
  series: { mes: string; kg: number }[];
  distribucion: Record<string, number>;
  recolecciones_recientes: Recoleccion[];
}

export default function EmpresaDashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      const res = await fetch('/api/metricas');
      const json = await res.json() as DashData;
      setData(json);
      setLoading(false);
    }

    cargar();
    const interval = setInterval(cargar, 30000);
    return () => clearInterval(interval);
  }, []);

  const pieData = data
    ? Object.entries(data.distribucion).map(([name, value]) => ({
        name,
        value: Math.round(value * 10) / 10,
      }))
    : [];

  const totalKg  = data?.metricas.total_kg ?? 0;
  const totalRec = data?.recolecciones_recientes?.length ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 h-[calc(100vh-66px)] overflow-y-auto">

      {/* Impact banner */}
      {!loading && totalKg > 0 && (
        <div className="relative rounded-card overflow-hidden bg-[var(--forest)] text-white px-5 py-5 sm:p-7 flex items-center justify-between gap-4 flex-wrap">
          <div className="absolute w-64 h-64 rounded-full bg-[rgba(75,175,71,0.15)] -right-16 -top-20 pointer-events-none" />
          <div className="relative z-10 min-w-0">
            <p className="font-mono text-[10px] sm:text-[11px] font-medium tracking-[0.18em] uppercase text-[#4BAF47] mb-2 flex items-center gap-2">
              <span className="w-4 h-px bg-[#4BAF47] inline-block shrink-0" /> Total reciclado · {new Date().getFullYear()}
            </p>
            <h2 className="font-display font-bold tracking-tight leading-tight text-white break-words"
                style={{ fontSize: 'clamp(20px, 5vw, 30px)' }}>
              {totalKg.toLocaleString()}{' '}
              <small className="font-bold text-white/70" style={{ fontSize: 'clamp(14px, 3vw, 18px)' }}>
                kg · {totalRec} recolecciones
              </small>
            </h2>
          </div>
          <span className="relative z-10 inline-flex items-center gap-2 text-[11px] sm:text-[12px] font-mono font-medium text-white/80 bg-white/10 px-3 py-1.5 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4BAF47] animate-pulse" />
            en vivo
          </span>
        </div>
      )}

      {/* Row 1 — 4 metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          loading={loading}
          label="Total reciclado"
          value={`${data?.metricas.total_kg ?? 0} kg`}
          icon={Recycle}
          color="green"
        />
        <MetricCard
          loading={loading}
          label="CO₂ evitado"
          value={`${data?.metricas.co2_kg ?? 0} kg`}
          icon={Wind}
          color="blue"
        />
        <MetricCard
          loading={loading}
          label="Agua ahorrada"
          value={`${(data?.metricas.agua_litros ?? 0).toLocaleString()} L`}
          icon={Droplets}
          color="blue"
        />
        <MetricCard
          loading={loading}
          label="Árboles salvados"
          value={String(data?.metricas.arboles ?? 0)}
          icon={TreePine}
          color="green"
        />
      </div>

      {/* Row 2 — charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Evolución mensual (kg)</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Skeleton className="h-60" />
            ) : (
              <LineChart data={data?.series ?? []} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por material</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Skeleton className="h-60" />
            ) : pieData.length > 0 ? (
              <PieChart data={pieData} />
            ) : (
              <p className="text-center text-body-text/70 py-20">Sin datos aún</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Row 3 — distribución por material */}
      {(loading || Object.keys(data?.distribucion ?? {}).length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por material</CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3.5 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : (() => {
              const entries = Object.entries(data!.distribucion).sort((a, b) => b[1] - a[1]);
              const total = entries.reduce((s, [, v]) => s + v, 0);
              return (
                <div className="space-y-3">
                  {entries.map(([mat, kg]) => {
                    const pct = total > 0 ? Math.round((kg / total) * 100) : 0;
                    return (
                      <div key={mat}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: matColor(mat) }} />
                            <span className="text-[13px] font-semibold text-black-heading capitalize">{mat}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[12px] font-mono">
                            <span className="font-bold text-black-heading tabular-nums">{kg.toLocaleString()} kg</span>
                            <span className="text-muted-text w-9 text-right tabular-nums">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--alt)' }}>
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: matColor(mat) }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-muted-text pt-1 font-mono">
                    Total: {total.toLocaleString()} kg · {entries.length} materiales
                  </p>
                </div>
              );
            })()}
          </CardBody>
        </Card>
      )}

      {/* Row 4 — tips personalizados */}
      <div>
        <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-body-text mb-3">Recomendaciones para vos</h2>
        <TipsPersonalizados data={data} loading={loading} />
      </div>

      {/* Row 4 — últimas recolecciones validadas */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas recolecciones validadas</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !data?.recolecciones_recientes?.length ? (
            <p className="text-sm text-body-text/70 py-8 text-center">
              Aún no tenés recolecciones validadas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default text-left text-body-text/70">
                    <th className="pb-2 pr-4 font-semibold">Material</th>
                    <th className="pb-2 pr-4 font-semibold">Cantidad (kg)</th>
                    <th className="pb-2 font-semibold">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {data.recolecciones_recientes.map((r) => (
                    <tr key={r.id} className="hover:bg-bg-page transition-colors">
                      <td className="py-2 pr-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#4BAF47] flex-shrink-0 inline-block" />
                        <span className="capitalize text-black-heading font-medium">
                          {r.tipo_material}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-body-text">
                        {r.cantidad_kg.toLocaleString()}
                      </td>
                      <td className="py-2 text-body-text">{r.fecha_recoleccion}</td>
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
