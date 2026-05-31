'use client';

import { useEffect, useState } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart } from '@/components/charts/BarChart';
import { Recycle, Droplets, TreePine } from 'lucide-react';
import type { Empresa, MetricasImpacto } from '@/types';

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

export default function AdminReportesPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [preview, setPreview] = useState<DashData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    fetch('/api/empresas')
      .then((r) => r.json())
      .then((j: { data: Empresa[] }) => {
        setEmpresas(j.data ?? []);
        setLoadingEmpresas(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedEmpresa) {
      setPreview(null);
      return;
    }
    setLoadingPreview(true);
    fetch(`/api/metricas?empresa_id=${selectedEmpresa.id}`)
      .then((r) => r.json())
      .then((json: DashData) => {
        setPreview(json);
        setLoadingPreview(false);
      })
      .catch(() => setLoadingPreview(false));
  }, [selectedEmpresa, anio]);

  async function handleDescargar() {
    if (!selectedEmpresa) return;
    setGenerando(true);
    const url = `/api/reporte?empresa_id=${selectedEmpresa.id}&anio=${anio}`;
    const res = await fetch(url);
    if (!res.ok) {
      setGenerando(false);
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-${selectedEmpresa.nombre}-${anio}.pdf`;
    a.click();
    setGenerando(false);
  }

  const barData = preview
    ? Object.entries(preview.distribucion).map(([name, value]) => ({
        name,
        value: Math.round(value * 10) / 10,
      }))
    : [];

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Left panel */}
      <aside className="w-72 flex-shrink-0 border-r border-border-default flex flex-col bg-card">
        <div className="px-5 pt-6 pb-4 border-b border-border-default">
          <h1 className="text-lg font-bold text-black-heading">Reportes</h1>
          <p className="text-xs text-body-text mt-0.5">Seleccioná empresa y año</p>
        </div>

        {/* Empresa list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {loadingEmpresas ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </>
          ) : empresas.length === 0 ? (
            <p className="text-sm text-body-text/60 text-center py-8">No hay empresas</p>
          ) : (
            empresas.map((e) => {
              const selected = selectedEmpresa?.id === e.id;
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedEmpresa(e)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${selected
                      ? 'bg-[#4BAF47] text-white'
                      : 'text-black-heading hover:bg-bg-page'
                    }`}
                >
                  {e.nombre}
                </button>
              );
            })
          )}
        </div>

        {/* Year selector at bottom */}
        <div className="px-5 py-4 border-t border-border-default">
          <p className="text-xs text-body-text mb-2">Año</p>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setAnio((y) => y - 1)}
              className="p-1.5 rounded hover:bg-bg-page transition-colors text-body-text"
              aria-label="Año anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-black-heading">{anio}</span>
            <button
              onClick={() => setAnio((y) => y + 1)}
              disabled={anio >= new Date().getFullYear()}
              className="p-1.5 rounded hover:bg-bg-page transition-colors text-body-text disabled:opacity-40"
              aria-label="Año siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedEmpresa ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <p className="text-2xl font-bold text-black-heading mb-2">
              Seleccioná una empresa
            </p>
            <p className="text-sm text-body-text/70">
              Elegí una empresa del panel izquierdo para ver su reporte.
            </p>
          </div>
        ) : (
          <>
            {/* Sub-header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-card flex-shrink-0">
              <div>
                <p className="text-base font-bold text-black-heading">{selectedEmpresa.nombre}</p>
                <p className="text-xs text-body-text/60">Reporte {anio}</p>
              </div>
              <Button
                onClick={handleDescargar}
                disabled={generando}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {generando ? 'Generando…' : 'Descargar PDF'}
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Metric cards */}
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

              {/* Bar chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Reciclaje por material</CardTitle>
                </CardHeader>
                <CardBody>
                  {loadingPreview ? (
                    <Skeleton className="h-56" />
                  ) : barData.length > 0 ? (
                    <BarChart data={barData} />
                  ) : (
                    <p className="text-sm text-body-text/70 py-8 text-center">
                      Sin datos para este período.
                    </p>
                  )}
                </CardBody>
              </Card>

              {/* Recolecciones recientes */}
              <Card>
                <CardHeader>
                  <CardTitle>Recolecciones recientes</CardTitle>
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
                      No hay recolecciones registradas.
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
          </>
        )}
      </div>
    </div>
  );
}
