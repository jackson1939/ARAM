'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CheckCheck, CheckCircle, XCircle, Edit2 } from 'lucide-react';
import { useDrawer } from '@/components/Drawer';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';
import type { Extraccion, Empresa } from '@/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS   = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── Calendar helpers ──────────────────────────────────────────────────────────

function todayISO() { return new Date().toISOString().slice(0, 10); }

function monthStart(y: number, m: number) {
  return ((new Date(y, m, 1).getDay() + 6) % 7); // Mon = 0
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

// ── DrawerCard: compact validacion card ───────────────────────────────────────

function DrawerCard({
  ext, empresas, onActualizar,
}: { ext: Extraccion; empresas: Empresa[]; onActualizar: () => void }) {
  const [editando,  setEditando]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [empresaId, setEmpresaId] = useState(ext.empresa_id ?? '');
  const [material,  setMaterial]  = useState(ext.tipo_material);
  const [cantidad,  setCantidad]  = useState(String(ext.cantidad_kg));
  const [fecha,     setFecha]     = useState(ext.fecha_recoleccion);

  const conf = Math.round((ext.confianza_ia ?? 0) * 100);
  const confVariant = conf >= 80 ? 'green' : conf >= 50 ? 'yellow' : 'red';

  async function accionar(accion: 'aprobar' | 'rechazar' | 'corregir') {
    setLoading(true);
    try {
      const res = await fetch('/api/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraccion_id: ext.id, accion,
          empresa_id:        empresaId || undefined,
          tipo_material:     material,
          cantidad_kg:       parseFloat(cantidad),
          fecha_recoleccion: fecha,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(accion === 'rechazar' ? 'Rechazada' : 'Aprobada');
      onActualizar();
    } catch { toast.error('Error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="border border-border-default rounded-[10px] overflow-hidden bg-card">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-default bg-bg-page">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-[13px] text-black-heading truncate">
            {ext.empresas?.nombre ?? 'Sin empresa'}
          </span>
          <Badge variant={confVariant}>IA {conf}%</Badge>
        </div>
        <button onClick={() => setEditando(v => !v)}
          className="w-6 h-6 flex items-center justify-center text-body-text hover:text-black-heading rounded transition-colors">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {ext.mensajes_recolector?.contenido_texto && (
          <p className="text-[12px] text-body-text bg-bg-page rounded-[6px] px-3 py-2 leading-relaxed line-clamp-2">
            {ext.mensajes_recolector.contenido_texto}
          </p>
        )}

        {editando ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-body-text mb-1 block">Empresa</label>
              <select value={empresaId} onChange={e => setEmpresaId(e.target.value)}
                className="w-full border border-border-default rounded-[6px] px-2 py-1.5 text-[12px]">
                <option value="">Sin empresa</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-body-text mb-1 block">Material</label>
              <select value={material} onChange={e => setMaterial(e.target.value)}
                className="w-full border border-border-default rounded-[6px] px-2 py-1.5 text-[12px]">
                {['plastico','papel','vidrio','metal','carton','electronico','organico']
                  .map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-body-text mb-1 block">Cantidad (kg)</label>
              <input type="number" step="0.01" value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                className="w-full border border-border-default rounded-[6px] px-2 py-1.5 text-[12px]" />
            </div>
            <div>
              <label className="text-[11px] text-body-text mb-1 block">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full border border-border-default rounded-[6px] px-2 py-1.5 text-[12px]" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 text-[12px]">
            <span className="text-body-text">Material: <strong className="text-black-heading capitalize">{ext.tipo_material}</strong></span>
            <span className="text-body-text">Cantidad: <strong className="text-black-heading">{ext.cantidad_kg} kg</strong></span>
            <span className="text-body-text">Fecha: <strong className="text-black-heading">{ext.fecha_recoleccion}</strong></span>
          </div>
        )}

        <div className="flex gap-1.5 pt-0.5">
          <button onClick={() => accionar(editando ? 'corregir' : 'aprobar')} disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#4BAF47] hover:bg-[#3d9a3a] text-white text-[12px] font-bold py-1.5 rounded-[7px] disabled:opacity-50 transition-colors">
            <CheckCircle className="w-3.5 h-3.5" />
            {editando ? 'Guardar' : 'Aprobar'}
          </button>
          <button onClick={() => accionar('rechazar')} disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 border border-[#D32F2F] text-[#D32F2F] hover:bg-[#FBEAEA] text-[12px] font-bold px-3 py-1.5 rounded-[7px] disabled:opacity-50 transition-colors">
            <XCircle className="w-3.5 h-3.5" />
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Drawer day content ────────────────────────────────────────────────────────

function DayContent({
  date, extracciones, empresas, onActualizar,
}: { date: string; extracciones: Extraccion[]; empresas: Empresa[]; onActualizar: () => void }) {
  const [loadingAll, setLoadingAll] = useState(false);
  const pending = extracciones.filter(e => e.estado === 'pendiente');

  const [d, m, y] = date.split('-').reverse().map(Number);

  async function validarTodas() {
    setLoadingAll(true);
    try {
      await Promise.all(pending.map(ext =>
        fetch('/api/validar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extraccion_id: ext.id, accion: 'aprobar' }),
        })
      ));
      toast.success(`${pending.length} extracción${pending.length > 1 ? 'es aprobadas' : ' aprobada'}`);
      onActualizar();
    } catch { toast.error('Error al validar'); }
    finally { setLoadingAll(false); }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="px-5 py-3 border-b border-border-default flex items-center justify-between gap-3 flex-shrink-0 bg-bg-page/60">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-body-text">
            {d} de {MONTHS[(m ?? 1) - 1]} {y}
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-light text-[#4BAF47]">
            {extracciones.length} extracción{extracciones.length !== 1 ? 'es' : ''}
          </span>
        </div>
        {pending.length > 0 && (
          <button onClick={validarTodas} disabled={loadingAll}
            className="inline-flex items-center gap-1.5 bg-[#4BAF47] hover:bg-[#3d9a3a] text-white text-[12px] font-bold px-3 py-1.5 rounded-[7px] disabled:opacity-50 transition-colors flex-shrink-0">
            <CheckCheck className="w-3.5 h-3.5" />
            {loadingAll ? 'Validando…' : `Validar todas (${pending.length})`}
          </button>
        )}
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {extracciones.length === 0 ? (
          <p className="text-center text-body-text text-sm py-12">Sin extracciones para este día.</p>
        ) : (
          extracciones.map(ext => (
            <DrawerCard key={ext.id} ext={ext} empresas={empresas} onActualizar={onActualizar} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ValidacionPage() {
  const drawer = useDrawer();
  const today  = todayISO();

  const [extracciones, setExtracciones] = useState<Extraccion[]>([]);
  const [empresas,     setEmpresas]     = useState<Empresa[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<string | null>(null);

  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const cargar = useCallback(async () => {
    setLoading(true);
    const [extRes, empRes] = await Promise.all([
      fetch('/api/extracciones?estado=pendiente'),
      fetch('/api/empresas'),
    ]);
    const extJson = await extRes.json();
    const empJson = await empRes.json();
    setExtracciones(extJson.data ?? []);
    setEmpresas(empJson.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  // Group by fecha_recoleccion
  const byDate = extracciones.reduce<Record<string, Extraccion[]>>((acc, e) => {
    const key = e.fecha_recoleccion;
    if (key) (acc[key] ??= []).push(e);
    return acc;
  }, {});

  function openDay(iso: string) {
    const list = byDate[iso] ?? [];
    setSelected(iso);
    drawer.open({
      title: `Extracciones · ${iso}`,
      children: (
        <DayContent
          date={iso}
          extracciones={list}
          empresas={empresas}
          onActualizar={() => { void cargar(); }}
        />
      ),
    });
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const startDay  = monthStart(year, month);
  const totalDays = daysInMonth(year, month);
  const cells     = Math.ceil((startDay + totalDays) / 7) * 7;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] p-5 gap-4">

      {/* Header */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <h1 className="text-2xl font-extrabold text-black-heading tracking-tight">Validación</h1>
        {!loading && extracciones.length > 0 && (
          <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-[#FFF8E1] text-[#F57F17]">
            {extracciones.length} pendiente{extracciones.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3 flex-1">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-full w-full" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-card border border-border-default rounded-[12px] overflow-hidden shadow-card flex flex-col">

          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-default flex-shrink-0">
            <button onClick={prevMonth}
              className="w-8 h-8 rounded-[7px] flex items-center justify-center text-body-text hover:bg-bg-page hover:text-black-heading transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-extrabold text-[15px] text-black-heading tracking-tight">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth}
              className="w-8 h-8 rounded-[7px] flex items-center justify-center text-body-text hover:bg-bg-page hover:text-black-heading transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 border-b border-border-default flex-shrink-0">
            {DAYS.map(d => (
              <div key={d} className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-body-text">
                {d}
              </div>
            ))}
          </div>

          {/* Grid — fills remaining height */}
          <div className="flex-1 min-h-0 grid grid-cols-7" style={{ gridTemplateRows: `repeat(${Math.ceil(cells / 7)}, 1fr)` }}>
            {Array.from({ length: cells }, (_, i) => {
              const dayNum = i - startDay + 1;
              const valid  = dayNum >= 1 && dayNum <= totalDays;

              if (!valid) {
                return <div key={i} className="border-b border-r border-border-default last:border-r-0 bg-bg-page/30" />;
              }

              const iso     = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const count   = byDate[iso]?.length ?? 0;
              const isToday = iso === today;
              const isSel   = iso === selected;

              return (
                <button
                  key={i}
                  onClick={() => openDay(iso)}
                  className={[
                    'border-b border-r border-border-default last:border-r-0',
                    'flex flex-col items-center justify-center gap-1.5 transition-colors',
                    isSel   ? 'bg-[#4BAF47]'      :
                    isToday ? 'bg-green-light'     :
                    count > 0 ? 'hover:bg-bg-page' :
                    'hover:bg-bg-page/50',
                  ].join(' ')}
                >
                  <span className={[
                    'text-[14px] font-bold leading-none',
                    isSel   ? 'text-white'      :
                    isToday ? 'text-[#4BAF47]'  :
                              'text-black-heading',
                  ].join(' ')}>
                    {dayNum}
                  </span>
                  {count > 0 && (
                    <span className={[
                      'text-[10px] font-extrabold px-1.5 py-px rounded-full leading-none',
                      isSel ? 'bg-white/30 text-white' : 'bg-[#4BAF47] text-white',
                    ].join(' ')}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="px-5 py-2.5 border-t border-border-default flex items-center gap-5 text-[12px] text-body-text flex-shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4BAF47]" />
              Con extracciones
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-light border border-[#4BAF47]" />
              Hoy
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
