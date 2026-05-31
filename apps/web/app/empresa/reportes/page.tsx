'use client';

import { useEffect, useState, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart } from '@/components/charts/BarChart';
import { Recycle, Droplets, TreePine } from 'lucide-react';
import type { MetricasImpacto } from '@/types';

type FiltroTipo = 'anio' | 'mes' | 'custom';
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
interface Recoleccion { id: string; tipo_material: string; cantidad_kg: number; fecha_recoleccion: string; }
interface PreviewData { metricas: MetricasImpacto; distribucion: Record<string, number>; recolecciones_recientes: Recoleccion[]; }

function getRange(tipo: FiltroTipo, anio: number, mes: number, desde: string, hasta: string) {
  if (tipo === 'anio') return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
  if (tipo === 'mes') { const last = new Date(anio, mes, 0).getDate(); const mm = String(mes).padStart(2,'0'); return { desde: `${anio}-${mm}-01`, hasta: `${anio}-${mm}-${last}` }; }
  return { desde, hasta };
}
function rangeLabel(tipo: FiltroTipo, anio: number, mes: number, desde: string, hasta: string) {
  if (tipo === 'anio') return String(anio);
  if (tipo === 'mes') return `${MESES[mes-1]} ${anio}`;
  return desde && hasta ? `${desde} → ${hasta}` : 'Rango personalizado';
}

export default function EmpresaReportesPage() {
  const now = new Date();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [generandoExcel, setGenerandoExcel] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('anio');
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes,  setMes]  = useState(now.getMonth() + 1);
  const [desde, setDesde] = useState(`${now.getFullYear()}-01-01`);
  const [hasta, setHasta] = useState(now.toISOString().slice(0, 10));
  const { desde: d, hasta: h } = useMemo(() => getRange(filtroTipo, anio, mes, desde, hasta), [filtroTipo, anio, mes, desde, hasta]);

  useEffect(() => {
    setLoadingPreview(true);
    fetch(`/api/metricas?desde=${d}&hasta=${h}`)
      .then(r => r.json()).then((j: PreviewData) => { setPreview(j); setLoadingPreview(false); })
      .catch(() => setLoadingPreview(false));
  }, [d, h]);

  async function handleDescargar() {
    setGenerando(true);
    const res = await fetch(`/api/reporte?desde=${d}&hasta=${h}`);
    if (!res.ok) { setGenerando(false); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mi-reporte-${d}-${h}.pdf`;
    a.click();
    setGenerando(false);
  }

  async function handleDescargarExcel() {
    setGenerandoExcel(true);
    const res = await fetch(`/api/reporte-excel?desde=${d}&hasta=${h}`);
    if (!res.ok) { setGenerandoExcel(false); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mi-reporte-${d}-${h}.xlsx`;
    a.click();
    setGenerandoExcel(false);
  }

  const barData = preview ? Object.entries(preview.distribucion).map(([name, value]) => ({ name, value: Math.round(value*10)/10 })) : [];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 h-[calc(100vh-66px)] overflow-y-auto">
      <div className="bg-card border border-border-default rounded-[12px] p-3 md:p-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-[8px] bg-bg-page p-0.5 gap-0.5">
          {(['anio','mes','custom'] as FiltroTipo[]).map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)} className={['px-3 py-1.5 text-[12px] font-bold rounded-[6px] transition-colors', filtroTipo===t ? 'bg-card text-black-heading shadow-sm' : 'text-body-text hover:text-black-heading'].join(' ')}>
              {t === 'anio' ? 'Año' : t === 'mes' ? 'Mes' : 'Personalizado'}
            </button>
          ))}
        </div>
        {filtroTipo === 'anio' && (
          <div className="flex items-center gap-1">
            <button onClick={() => setAnio(y=>y-1)} className="p-1 rounded hover:bg-bg-page text-body-text"><ChevronLeft className="w-4 h-4"/></button>
            <span className="font-extrabold text-[15px] text-black-heading w-12 text-center">{anio}</span>
            <button onClick={() => setAnio(y=>y+1)} disabled={anio>=now.getFullYear()} className="p-1 rounded hover:bg-bg-page text-body-text disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button>
          </div>
        )}
        {filtroTipo === 'mes' && (
          <div className="flex items-center gap-1">
            <button onClick={() => { if(mes===1){setMes(12);setAnio(y=>y-1);}else setMes(m=>m-1); }} className="p-1 rounded hover:bg-bg-page text-body-text"><ChevronLeft className="w-4 h-4"/></button>
            <span className="font-bold text-[13px] text-black-heading w-28 text-center">{MESES[mes-1]} {anio}</span>
            <button onClick={() => { if(mes===12){setMes(1);setAnio(y=>y+1);}else setMes(m=>m+1); }} disabled={anio>=now.getFullYear()&&mes>=now.getMonth()+1} className="p-1 rounded hover:bg-bg-page text-body-text disabled:opacity-40"><ChevronRight className="w-4 h-4"/></button>
          </div>
        )}
        {filtroTipo === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={desde} onChange={e=>setDesde(e.target.value)} className="border border-border-default rounded-[7px] px-3 py-1.5 text-[13px] bg-card text-black-heading outline-none focus:border-[#4BAF47]"/>
            <span className="text-body-text text-sm">→</span>
            <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} className="border border-border-default rounded-[7px] px-3 py-1.5 text-[13px] bg-card text-black-heading outline-none focus:border-[#4BAF47]"/>
          </div>
        )}
        <div className="flex-1"/>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-body-text hidden sm:block">{rangeLabel(filtroTipo, anio, mes, desde, hasta)}</span>
          <button onClick={handleDescargarExcel} disabled={generandoExcel} className="inline-flex items-center gap-1.5 bg-[#217346] hover:bg-[#1a5c38] text-white text-[13px] font-bold px-4 py-2 rounded-[8px] disabled:opacity-50 transition-colors">
            <Download className="w-3.5 h-3.5"/>{generandoExcel ? 'Generando…' : 'Descargar Excel'}
          </button>
          <button onClick={handleDescargar} disabled={generando} className="inline-flex items-center gap-1.5 bg-[#4BAF47] hover:bg-[#3d9a3a] text-white text-[13px] font-bold px-4 py-2 rounded-[8px] disabled:opacity-50 transition-colors">
            <Download className="w-3.5 h-3.5"/>{generando ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <MetricCard loading={loadingPreview} label="Total reciclado" value={`${preview?.metricas.total_kg??0} kg`} icon={Recycle} color="green"/>
        <MetricCard loading={loadingPreview} label="CO₂ evitado" value={`${preview?.metricas.co2_kg??0} kg`} icon={Droplets} color="blue"/>
        <MetricCard loading={loadingPreview} label="Agua ahorrada" value={`${(preview?.metricas.agua_litros??0).toLocaleString()} L`} icon={TreePine} color="blue"/>
      </div>

      <Card>
        <CardHeader><CardTitle>Por material · {rangeLabel(filtroTipo, anio, mes, desde, hasta)}</CardTitle></CardHeader>
        <CardBody>
          {loadingPreview ? <Skeleton className="h-52"/> : barData.length>0 ? <BarChart data={barData}/> : <p className="text-sm text-body-text py-8 text-center">Sin datos para este período.</p>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recolecciones del período</CardTitle></CardHeader>
        <CardBody>
          {loadingPreview ? (
            <div className="space-y-2">{[1,2,3,4].map(i=><Skeleton key={i} className="h-9"/>)}</div>
          ) : !preview?.recolecciones_recientes?.length ? (
            <p className="text-sm text-body-text py-8 text-center">Sin recolecciones para este período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border-default">
                <th className="text-left pb-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Material</th>
                <th className="text-right pb-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Kg</th>
                <th className="text-right pb-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Fecha</th>
              </tr></thead>
              <tbody className="divide-y divide-border-default">
                {preview.recolecciones_recientes.map(r=>(
                  <tr key={r.id} className="hover:bg-bg-page transition-colors">
                    <td className="py-2.5 pr-4"><span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded bg-[#4BAF47] opacity-80 flex-shrink-0"/><span className="capitalize font-semibold text-black-heading">{r.tipo_material}</span></span></td>
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
  );
}
