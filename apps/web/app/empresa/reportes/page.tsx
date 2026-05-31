'use client';

import { useEffect, useState } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Recycle, Droplets, TreePine } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
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

export default function EmpresaReportesPage() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [generando, setGenerando] = useState(false);
  const [preview, setPreview] = useState<DashData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);

  useEffect(() => {
    setLoadingPreview(true);
    fetch('/api/metricas')
      .then((r) => r.json())
      .then((json: DashData) => {
        setPreview(json);
        setLoadingPreview(false);
      })
      .catch(() => setLoadingPreview(false));
  }, [anio]);

  async function handleDescargar() {
    setGenerando(true);
    const res = await fetch(`/api/reporte?anio=${anio}`);
    if (!res.ok) {
      setGenerando(false);
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mi-reporte-${anio}.pdf`;
    a.click();
    setGenerando(false);
  }

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-56px)] overflow-y-auto">
      {/* Year selector card */}
      <Card>
        <CardHeader>
          <CardTitle>Mi reporte anual</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAnio((y) => y - 1)}
                className="p-1.5 rounded hover:bg-bg-page transition-colors text-body-text"
                aria-label="Año anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-lg font-bold text-black-heading w-16 text-center">
                {anio}
              </span>
              <button
                onClick={() => setAnio((y) => y + 1)}
                disabled={anio >= new Date().getFullYear()}
                className="p-1.5 rounded hover:bg-bg-page transition-colors text-body-text disabled:opacity-40"
                aria-label="Año siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <Button
              onClick={handleDescargar}
              disabled={generando}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {generando ? 'Generando PDF…' : 'Descargar PDF'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Impact metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          loading={loadingPreview}
          label="Total reciclado"
          value={`${preview?.metricas.total_kg ?? 0} kg`}
          icon={Recycle}
          color="green"
        />
        <MetricCard
          loading={loadingPreview}
          label="CO₂ evitado"
          value={`${preview?.metricas.co2_kg ?? 0} kg`}
          icon={Droplets}
          color="blue"
        />
        <MetricCard
          loading={loadingPreview}
          label="Agua ahorrada"
          value={`${(preview?.metricas.agua_litros ?? 0).toLocaleString()} L`}
          icon={TreePine}
          color="blue"
        />
      </div>

      {/* Recolecciones table */}
      <Card>
        <CardHeader>
          <CardTitle>Mis recolecciones validadas</CardTitle>
        </CardHeader>
        <CardBody>
          {loadingPreview ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !preview?.recolecciones_recientes?.length ? (
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
                  {preview.recolecciones_recientes.map((r) => (
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
