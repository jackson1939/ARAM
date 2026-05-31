'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CanalStat {
  canal: string;
  total_mensajes: number;
  usuarios_unicos: number;
  pendientes: number;
  procesando: number;
  extraidos: number;
  validados: number;
  rechazados: number;
}

interface Totales {
  total_mensajes: number;
  usuarios_unicos: number;
  pendientes: number;
  procesando: number;
  extraidos: number;
  validados: number;
  rechazados: number;
  kg_total: number;
}

interface Mensaje {
  id: string;
  canal: string | null;
  canalUserId: string | null;
  contenidoTexto: string | null;
  estado: string | null;
  recibidoAt: string | null;
}

interface Extraccion {
  id: string;
  tipo_material: string;
  cantidad_kg: string;
  estado: string;
  created_at: string;
  canal: string | null;
  canal_user_id: string | null;
}

interface Recolector {
  id: string;
  nombre: string | null;
  telegramChatId: string | null;
  whatsappNumber: string | null;
  createdAt: string | null;
}

interface MonitoreoData {
  canales: CanalStat[];
  totales: Totales;
  mensajes: Mensaje[];
  extracciones: Extraccion[];
  recolectores: Recolector[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const CANAL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  all: {
    label: 'Todos los canales',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
    color: '#6B6A62',
  },
  telegram: {
    label: 'Telegram',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
      </svg>
    ),
    color: '#0088cc',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    ),
    color: '#25D366',
  },
};

function estadoBadge(estado: string | null) {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    pendiente:  { label: 'Pendiente',  bg: '#FFF8E1', fg: '#F57F17' },
    procesando: { label: 'Procesando', bg: '#E3F2FD', fg: '#1565C0' },
    extraido:   { label: 'Extraído',   bg: '#EDF7ED', fg: '#4BAF47' },
    validado:   { label: 'Validado',   bg: '#E8F5E9', fg: '#2E7D32' },
    rechazado:  { label: 'Rechazado',  bg: '#FBEAEA', fg: '#D32F2F' },
  };
  const s = map[estado ?? ''] ?? { label: estado ?? '—', bg: '#F6F6F4', fg: '#6B6A62' };
  return (
    <span
      className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

function canalBadge(canal: string | null) {
  const meta = CANAL_META[canal ?? ''];
  if (!meta) return <span className="text-[11px] text-body-text">{canal ?? '—'}</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: meta.color }}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function MonitoreoPage() {
  const [data, setData]           = useState<MonitoreoData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [canal, setCanal]         = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    try {
      const res  = await fetch('/api/monitoreo');
      const json = await res.json() as MonitoreoData;
      setData(json);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Derived data filtered by selected canal
  const stats: CanalStat | Totales = canal === 'all'
    ? (data?.totales ?? {} as Totales)
    : (data?.canales.find(c => c.canal === canal) ?? {} as CanalStat);

  const mensajes = (data?.mensajes ?? []).filter(
    m => canal === 'all' || m.canal === canal,
  );

  const extracciones = (data?.extracciones ?? []).filter(
    e => canal === 'all' || e.canal === canal,
  );

  const recolectores = (data?.recolectores ?? []).filter(r =>
    canal === 'all' ||
    (canal === 'telegram' && r.telegramChatId) ||
    (canal === 'whatsapp' && r.whatsappNumber),
  );

  // All channels present in data + always show whatsapp/telegram
  const channelKeys = ['all', 'telegram', 'whatsapp'];

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">

      {/* ── Left: channel list ──────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 border-r border-border-default bg-card flex flex-col">
        <div className="px-4 py-4 border-b border-border-default flex items-center justify-between">
          <span className="text-[12px] font-bold uppercase tracking-widest text-body-text">Canales</span>
          <button
            onClick={() => load(true)}
            className="w-6 h-6 rounded flex items-center justify-center text-body-text hover:bg-bg-page transition-colors"
            title="Actualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {channelKeys.map(key => {
            const meta   = CANAL_META[key]!;
            const count  = key === 'all'
              ? (data?.totales.total_mensajes ?? 0)
              : (data?.canales.find(c => c.canal === key)?.total_mensajes ?? 0);
            const active = canal === key;

            return (
              <button
                key={key}
                onClick={() => setCanal(key)}
                className={[
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[7px] text-sm transition-colors text-left',
                  active
                    ? 'bg-green-light font-bold'
                    : 'text-body-text font-semibold hover:bg-bg-page hover:text-black-heading',
                ].join(' ')}
                style={active ? { color: meta.color } : {}}
              >
                <span style={{ color: active ? meta.color : '#878680' }}>{meta.icon}</span>
                <span className="flex-1 truncate">{meta.label}</span>
                {count > 0 && (
                  <span
                    className="text-[11px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                    style={{
                      background: active ? meta.color : '#F6F6F4',
                      color:      active ? '#fff' : '#6B6A62',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Right: content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-body-text text-sm">
            Cargando…
          </div>
        ) : (
          <div className="p-6 space-y-6">

            {/* Channel header */}
            <div className="flex items-center gap-3">
              <span style={{ color: CANAL_META[canal]?.color ?? '#6B6A62' }}>
                {CANAL_META[canal]?.icon}
              </span>
              <h2 className="text-xl font-extrabold text-black-heading tracking-tight">
                {CANAL_META[canal]?.label ?? canal}
              </h2>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Mensajes',   value: (stats as CanalStat).total_mensajes ?? 0,  color: '#1A1A18' },
                { label: 'Extraídos',  value: (stats as CanalStat).extraidos ?? 0,        color: '#4BAF47' },
                { label: 'Validados',  value: (stats as CanalStat).validados ?? 0,        color: '#2E7D32' },
                { label: 'Rechazados', value: (stats as CanalStat).rechazados ?? 0,       color: '#D32F2F' },
              ].map(card => (
                <div key={card.label} className="bg-card rounded-[10px] border border-border-default px-4 py-4">
                  <div className="text-[12px] font-semibold text-body-text uppercase tracking-wide mb-1">{card.label}</div>
                  <div className="text-3xl font-extrabold tracking-tight" style={{ color: card.color }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Second row: kg + recolectores + usuarios */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-[10px] border border-border-default px-4 py-4">
                <div className="text-[12px] font-semibold text-body-text uppercase tracking-wide mb-1">Kg total extraído</div>
                <div className="text-2xl font-extrabold text-black-heading">
                  {extracciones.reduce((s, e) => s + parseFloat(e.cantidad_kg ?? '0'), 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                  <span className="text-sm font-semibold text-body-text ml-1">kg</span>
                </div>
              </div>
              <div className="bg-card rounded-[10px] border border-border-default px-4 py-4">
                <div className="text-[12px] font-semibold text-body-text uppercase tracking-wide mb-1">Recolectores</div>
                <div className="text-2xl font-extrabold text-black-heading">{recolectores.length}</div>
              </div>
              <div className="bg-card rounded-[10px] border border-border-default px-4 py-4">
                <div className="text-[12px] font-semibold text-body-text uppercase tracking-wide mb-1">Usuarios únicos</div>
                <div className="text-2xl font-extrabold text-black-heading">
                  {(stats as CanalStat).usuarios_unicos ?? 0}
                </div>
              </div>
            </div>

            {/* Messages table */}
            <div>
              <div className="text-[12px] font-bold uppercase tracking-widest text-body-text mb-3">
                Mensajes recientes ({mensajes.length})
              </div>
              <div className="bg-card border border-border-default rounded-[10px] overflow-hidden">
                {mensajes.length === 0 ? (
                  <p className="text-center text-body-text text-sm py-10">Sin mensajes aún.</p>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-bg-page border-b border-border-default">
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Canal</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Mensaje</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Estado</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Recibido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mensajes.map((m, i) => (
                        <tr key={m.id} className={i % 2 === 0 ? 'bg-card' : 'bg-alt'}>
                          <td className="px-4 py-3 whitespace-nowrap">{canalBadge(m.canal)}</td>
                          <td className="px-4 py-3 text-black-heading max-w-xs">
                            <span className="line-clamp-1 text-[13px]">{m.contenidoTexto ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{estadoBadge(m.estado)}</td>
                          <td className="px-4 py-3 text-[12px] text-body-text whitespace-nowrap">{fmtDate(m.recibidoAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Extractions by material */}
            {extracciones.length > 0 && (
              <div>
                <div className="text-[12px] font-bold uppercase tracking-widest text-body-text mb-3">
                  Materiales extraídos ({extracciones.length})
                </div>
                <div className="bg-card border border-border-default rounded-[10px] overflow-hidden">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-bg-page border-b border-border-default">
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Material</th>
                        <th className="text-right px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Cantidad</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Estado</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Canal</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-body-text">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extracciones.map((e, i) => (
                        <tr key={e.id} className={i % 2 === 0 ? 'bg-card' : 'bg-alt'}>
                          <td className="px-4 py-3 font-bold text-black-heading">
                            <span className="inline-flex items-center gap-2">
                              <span className="w-2 h-2 rounded-[2px] bg-[#4BAF47] opacity-80 flex-shrink-0" />
                              {e.tipo_material}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-black-heading tabular-nums">
                            {parseFloat(e.cantidad_kg).toLocaleString('es-AR')} kg
                          </td>
                          <td className="px-4 py-3">{estadoBadge(e.estado)}</td>
                          <td className="px-4 py-3">{canalBadge(e.canal)}</td>
                          <td className="px-4 py-3 text-[12px] text-body-text whitespace-nowrap">{fmtDate(e.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recolectores */}
            {recolectores.length > 0 && (
              <div>
                <div className="text-[12px] font-bold uppercase tracking-widest text-body-text mb-3">
                  Recolectores registrados ({recolectores.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {recolectores.map(r => (
                    <div key={r.id} className="bg-card border border-border-default rounded-[10px] px-4 py-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-light text-[#4BAF47] grid place-items-center text-[13px] font-extrabold flex-shrink-0">
                        {(r.nombre ?? 'R').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[13px] text-black-heading truncate">{r.nombre ?? 'Sin nombre'}</div>
                        <div className="text-[11px] text-body-text mt-0.5 space-x-2">
                          {r.telegramChatId && <span className="text-[#0088cc]">Telegram</span>}
                          {r.whatsappNumber && <span className="text-[#25D366]">WhatsApp</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
