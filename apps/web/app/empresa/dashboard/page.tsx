'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart } from '@/components/charts/LineChart';
import { PieChart } from '@/components/charts/PieChart';
import { Recycle, Droplets, TreePine, Wind } from 'lucide-react';
import type { MetricasImpacto } from '@/types';

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

  return (
    <div className="p-6 space-y-5 h-[calc(100vh-56px)] overflow-y-auto">
      {/* Row 1 — 4 metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

      {/* Row 3 — últimas recolecciones validadas */}
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
