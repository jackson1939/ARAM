'use client';

import { useEffect, useState, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart } from '@/components/charts/BarChart';
import { Recycle, Droplets, TreePine } from 'lucide-react';
import type { Empresa, MetricasImpacto } from '@/types';

type FiltroTipo = 'anio' | 'mes' | 'custom';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface Recoleccion { id: string; tipo_material: string; cantidad_kg: number; fecha_recoleccion: string; empresa_nombre?: string | null; }
interface PreviewData { metricas: MetricasImpacto; distribucion: Record<string, number>; recolecciones_recientes: Recoleccion[]; }

function getRange(tipo: FiltroTipo, anio: number, mes: number, desde: string, hasta: string) {
  if (tipo === 'anio') return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
  if (tipo === 'mes') {
    const last = new Date(anio, mes, 0).getDate();
    const mm   = String(mes).padStart(2, '0');
    return { desde: `${anio}-${mm}-01`, hasta: `${anio}-${mm}-${last}` };
  }
  return { desde, hasta };
}

function rangeLabel(tipo: FiltroTipo, anio: number, mes: number, desde: string, hasta: string) {
  if (tipo === 'anio')   return String(anio);
  if (tipo === 'mes')    return `${MESES[mes - 1]} ${anio}`;
  return desde && hasta ? `${desde} → ${hasta}` : 'Rango personalizado';
}

export default function AdminReportesPage() {
  const now = new Date();
  const [empresas,        setEmpresas]        = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [preview,         setPreview]         = useState<PreviewData | null>(null);
  const [loadingPreview,  setLoadingPreview]  = useState(false);
  const [generando,       setGenerando]       = useState(false);
  const [generandoExcel, setGenerandoExcel]   = useState(false);

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('anio');
  const [anio,       setAnio]       = useState(now.getFullYear());
  const [mes,        setMes]        = useState(now.getMonth() + 1);
  const [desde,      setDesde]      = useState(`${now.getFullYear()}-01-01`);
  const [hasta,      setHasta]      = useState(now.toISOString().slice(0, 10));

  const { desde: d, hasta: h } = useMemo(
    () => getRange(filtroTipo, anio, mes, desde, hasta),
    [filtroTipo, anio, mes, desde, hasta],
  );

  useEffect(() => {
    fetch('/api/empresas')
      .then(r => r.json())
      .then((j: { data: Empresa[] }) => { setEmpresas(j.data ?? []); setLoadingEmpresas(false); });
  }, []);

  useEffect(() => {
    setLoadingPreview(true);
    const p = new URLSearchParams({ desde: d, hasta: h });
    if (selectedEmpresa) p.set('empresa_id', selectedEmpresa.id);
    fetch(`/api/metricas?${p.toString()}`)
      .then(r => r.json())
      .then((j: PreviewData) => { setPreview(j); setLoadingPreview(false); })
      .catch(() => setLoadingPreview(false));
  }, [selectedEmpresa, d, h]);

  async function handleDescargar() {
    setGenerando(true);
    const p = new URLSearchParams({ desde: d, hasta: h });
    if (selectedEmpresa) p.set('empresa_id', selectedEmpresa.id);
    const res = await fetch(`/api/reporte?${p.toString()}`);
    if (!res.ok) { setGenerando(false); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-${selectedEmpresa ? selectedEmpresa.nombre : 'global'}-${d}-${h}.pdf`;
    a.click();
    setGenerando(false);
  }

  async function handleDescargarExcel() {
    setGenerandoExcel(true);
    const p = new URLSearchParams({ desde: d, hasta: h });
    if (selectedEmpresa) p.set('empresa_id', selectedEmpresa.id);
    const res = await fetch(`/api/reporte-excel?${p.toString()}`);
    if (!res.ok) { setGenerandoExcel(false); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-${selectedEmpresa ? selectedEmpresa.nombre : 'global'}-${d}-${h}.xlsx`;
    a.click();
    setGenerandoExcel(false);
  }

  const barData = preview
    ? Object.entries(preview.distribucion).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))
    : [];

  return (
    <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-66px)]">

      {/* ── Left panel ── */}
      <aside className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-border-default flex flex-col bg-card">

        {/* Filter type */}
        <div className="p-3 border-b border-border-default">
          <div data-tour="filtro-tipo" className="flex rounded-[8px] bg-bg-page p-0.5 gap-0.5">
            {(['anio', 'mes', 'custom'] as FiltroTipo[]).map(t => (
              <button key={t} onClick={() => setFiltroTipo(t)}
                className={[
                  'flex-1 py-1.5 text-[11px] font-bold rounded-[6px] transition-colors',
                  filtroTipo === t ? 'bg-card text-black-heading shadow-sm' : 'text-body-text hover:text-black-heading',
                ].join(' ')}>
                {t === 'anio' ? 'Año' : t === 'mes' ? 'Mes' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Date selector */}
        <div className="px-4 py-3 border-b border-border-default flex-shrink-0">
          {filtroTipo === 'anio' && (
            <div className="flex items-center justify-between">
              <button onClick={() => setAnio(y => y - 1)} className="p-1 rounded hover:bg-bg-page text-body-text"><ChevronLeft className="w-4 h-4"/></button>
              <span className="font-extrabold text-[15px] text-black-heading">{anio}</span>
              <button onClick={() => setAnio(y => y + 1)} disabled={anio >= now.getFullYear()} className="p-1 rounded hover:bg-bg-page text-body-text disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button>
            </div>
          )}
          {filtroTipo === 'mes' && (
            <div className="flex items-center justify-between">
              <button onClick={() => { if (mes === 1) { setMes(12); setAnio(y => y - 1); } else setMes(m => m - 1); }} className="p-1 rounded hover:bg-bg-page text-body-text"><ChevronLeft className="w-4 h-4"/></button>
              <span className="font-bold text-[13px] text-black-heading">{MESES[mes - 1]} {anio}</span>
              <button onClick={() => { if (mes === 12) { setMes(1); setAnio(y => y + 1); } else setMes(m => m + 1); }} disabled={anio >= now.getFullYear() && mes >= now.getMonth() + 1} className="p-1 rounded hover:bg-bg-page text-body-text disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button>
            </div>
          )}
          {filtroTipo === 'custom' && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-body-text uppercase tracking-wide block mb-1">Desde</label>
                <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                  className="w-full border border-border-default rounded-[7px] px-2 py-1.5 text-[12px] bg-card text-black-heading outline-none focus:border-[#4BAF47]"/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-body-text uppercase tracking-wide block mb-1">Hasta</label>
                <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                  className="w-full border border-border-default rounded-[7px] px-2 py-1.5 text-[12px] bg-card text-black-heading outline-none focus:border-[#4BAF47]"/>
              </div>
            </div>
          )}
        </div>

        {/* Empresa list */}
        <div data-tour="empresa-selector" className="flex-1 overflow-y-auto md:overflow-y-auto max-h-48 md:max-h-none p-2 space-y-0.5">
          <button onClick={() => setSelectedEmpresa(null)}
            className={[
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[7px] text-sm transition-colors border-r-2',
              !selectedEmpresa ? 'bg-green-light text-[#4BAF47] font-bold border-r-[#4BAF47]' : 'text-body-text font-semibold hover:bg-bg-page border-r-transparent',
            ].join(' ')}>
            <Building2 className="w-4 h-4 flex-shrink-0"/>
            Todas las empresas
          </button>
          {loadingEmpresas
            ? [1,2,3].map(i => <Skeleton key={i} className="h-10 mx-0.5"/>)
            : empresas.map(e => (
              <button key={e.id} onClick={() => setSelectedEmpresa(e)}
                className={[
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[7px] text-sm transition-colors border-r-2',
                  selectedEmpresa?.id === e.id ? 'bg-green-light text-[#4BAF47] font-bold border-r-[#4BAF47]' : 'text-body-text font-semibold hover:bg-bg-page border-r-transparent',
                ].join(' ')}>
                <span className={`w-6 h-6 rounded-[5px] grid place-items-center flex-shrink-0 text-[10px] font-extrabold ${selectedEmpresa?.id === e.id ? 'bg-[#4BAF47] text-white' : 'bg-green-light text-[#4BAF47]'}`}>
                  {e.nombre.slice(0, 2).toUpperCase()}
                </span>
                <span className="truncate">{e.nombre}</span>
              </button>
            ))
          }
        </div>
      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border-default bg-card flex-shrink-0">
          <div className="min-w-0">
            <p className="font-extrabold text-[14px] sm:text-[15px] text-black-heading truncate">
              {selectedEmpresa ? selectedEmpresa.nombre : 'Todas las empresas'}
            </p>
            <p className="text-[12px] text-body-text">{rangeLabel(filtroTipo, anio, mes, desde, hasta)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleDescargarExcel} disabled={generandoExcel}
              className="inline-flex items-center gap-1.5 bg-[#217346] hover:bg-[#1a5c38] text-white text-[12px] sm:text-[13px] font-bold px-3 sm:px-4 py-2 rounded-[8px] disabled:opacity-50 transition-colors whitespace-nowrap">
              <Download className="w-3.5 h-3.5 flex-shrink-0"/>
              {generandoExcel ? 'Generando…' : <><span className="hidden sm:inline">Descargar </span>Excel</>}
            </button>
            <button data-tour="btn-descargar" onClick={handleDescargar} disabled={generando}
              className="inline-flex items-center gap-1.5 bg-[#4BAF47] hover:bg-[#3d9a3a] text-white text-[12px] sm:text-[13px] font-bold px-3 sm:px-4 py-2 rounded-[8px] disabled:opacity-50 transition-colors whitespace-nowrap">
              <Download className="w-3.5 h-3.5 flex-shrink-0"/>
              {generando ? 'Generando…' : <><span className="hidden sm:inline">Descargar </span>PDF</>}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <MetricCard loading={loadingPreview} label="Total reciclado" value={`${preview?.metricas.total_kg ?? 0} kg`} icon={Recycle} color="green"/>
            <MetricCard loading={loadingPreview} label="CO₂ evitado" value={`${preview?.metricas.co2_kg ?? 0} kg`} icon={Droplets} color="blue"/>
            <MetricCard loading={loadingPreview} label="Agua ahorrada" value={`${(preview?.metricas.agua_litros ?? 0).toLocaleString()} L`} icon={TreePine} color="blue"/>
          </div>

          <Card>
            <CardHeader><CardTitle>Por material · {rangeLabel(filtroTipo, anio, mes, desde, hasta)}</CardTitle></CardHeader>
            <CardBody>
              {loadingPreview ? <Skeleton className="h-52"/> : barData.length > 0 ? <BarChart data={barData}/> : <p className="text-sm text-body-text py-8 text-center">Sin datos para este período.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recolecciones del período</CardTitle></CardHeader>
            <CardBody>
              {loadingPreview ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-9"/>)}</div>
              ) : !preview?.recolecciones_recientes?.length ? (
                <p className="text-sm text-body-text py-8 text-center">Sin recolecciones en este período.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-default">
                      <th className="text-left pb-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Material</th>
                      {!selectedEmpresa && <th className="text-left pb-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Empresa</th>}
                      <th className="text-right pb-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Kg</th>
                      <th className="text-right pb-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {preview.recolecciones_recientes.map(r => (
                      <tr key={r.id} className="hover:bg-bg-page transition-colors">
                        <td className="py-2.5 pr-4">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded bg-[#4BAF47] opacity-80 flex-shrink-0"/>
                            <span className="capitalize font-semibold text-black-heading">{r.tipo_material}</span>
                          </span>
                        </td>
                        {!selectedEmpresa && <td className="py-2.5 pr-4 text-body-text">{r.empresa_nombre ?? '—'}</td>}
                        <td className="py-2.5 pr-4 text-right font-semibold text-black-heading tabular-nums">{r.cantidad_kg.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-body-text">{r.fecha_recoleccion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
