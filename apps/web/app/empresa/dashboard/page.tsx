'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart } from '@/components/charts/LineChart';
import { PieChart } from '@/components/charts/PieChart';
import { Recycle, Droplets, TreePine, Wind } from 'lucide-react';
import type { MetricasImpacto } from '@/types';

interface DashData {
  metricas: MetricasImpacto;
  series: { mes: string; kg: number }[];
  distribucion: Record<string, number>;
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
    <div className="p-6 space-y-6 h-[calc(100vh-56px)] overflow-y-auto">
      <h1 className="text-2xl font-bold text-black-heading">Mi impacto ambiental</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard loading={loading} label="Total reciclado" value={`${data?.metricas.total_kg ?? 0} kg`} icon={Recycle} color="green" />
        <MetricCard loading={loading} label="CO₂ evitado" value={`${data?.metricas.co2_kg ?? 0} kg`} icon={Wind} color="blue" />
        <MetricCard loading={loading} label="Agua ahorrada" value={`${(data?.metricas.agua_litros ?? 0).toLocaleString()} L`} icon={Droplets} color="blue" />
        <MetricCard loading={loading} label="Árboles salvados" value={String(data?.metricas.arboles ?? 0)} icon={TreePine} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Reciclaje mensual (kg)</CardTitle></CardHeader>
          <CardBody>
            {loading ? <Skeleton className="h-60" /> : <LineChart data={data?.series ?? []} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Por tipo de material</CardTitle></CardHeader>
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
    </div>
  );
}
