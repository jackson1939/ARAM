'use client';

import React, { useState, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab   = 'texto' | 'imagen' | 'video';
type Phase = 'idle' | 'loading' | 'done';

interface ExtractionUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  modelId: string;
}

interface Material {
  type: string;
  quantity: number | null;
  unit: 'kg' | 'unit' | null;
}

interface ExtractionData {
  company: string | null;
  date: string | null;
  materials: Material[];
  notes: string | null;
}

interface ExtractionResult {
  sessionId: string;
  inputType: 'text' | 'image' | 'video';
  confidence: 'high' | 'medium' | 'low';
  extracted: ExtractionData | null;
  rejectedReasons?: string[];
  usage?: ExtractionUsage;
  description?: string;
}

interface PresignResponse {
  sessionId: string;
  uploadUrl: string;
  expiresIn: number;
}

interface UIResult {
  status: 'success' | 'reject';
  confidence?: 'high' | 'medium' | 'low';
  empresa?: string | null;
  fecha?: string | null;
  notas?: string | null;
  materials?: { material: string; cantidad: string | null; unidad: string | null }[];
  reasons?: string[];
  tip?: string;
  usage?: ExtractionUsage;
  description?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = 'https://um5iwhzmob.execute-api.us-east-1.amazonaws.com/api/v1';

const SAMPLE = 'Hola! Te paso lo del retiro de hoy. Empresa Verdesur entregó 50 kg de papel y 30 kg de cartón el 15/03/2026. También dejaron 12 kg de plástico. Material limpio y seco, retiro en domicilio.';

const TIERS = [
  { key: '1K',   requests: 1_000,   label: '1.000',   highlight: false },
  { key: '10K',  requests: 10_000,  label: '10.000',  highlight: true  },
  { key: '100K', requests: 100_000, label: '100.000', highlight: false },
];

const REJECTION_MAP: Record<string, { msg: string; tip: string }> = {
  no_collection_data: {
    msg: 'No se encontraron datos de recolección en el contenido.',
    tip: 'Asegurate de que el archivo muestre un remito, ticket o comprobante con materiales y cantidades.',
  },
  low_confidence: {
    msg: 'La confianza del modelo fue demasiado baja para extraer datos.',
    tip: 'Intentá con un mensaje más detallado o una imagen más clara.',
  },
  not_a_collection_document: {
    msg: 'El documento no corresponde a una recolección de materiales.',
    tip: 'Verificá que la imagen sea un remito o comprobante de retiro de reciclables.',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(file: File | null): string {
  if (!file) return '';
  const kb = file.size / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
}

function formatCost(usd: number): string {
  if (usd < 0.001) return `$${(usd * 1000).toFixed(4)} m¢`;
  return `$${usd.toFixed(5)}`;
}

function formatUsd(usd: number): string {
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}K`;
  if (usd >= 100)  return `$${usd.toFixed(0)}`;
  if (usd >= 1)    return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(5)}`;
}

function confBg(c?: string | null): string {
  if (c === 'high')   return '#EDF7ED';
  if (c === 'medium') return '#FFF8E1';
  return '#FBEAEA';
}

function confFg(c?: string | null): string {
  if (c === 'high')   return '#4BAF47';
  if (c === 'medium') return '#F57F17';
  return '#D32F2F';
}

function confLabel(c?: string | null): string {
  if (c === 'high')   return 'Alta confianza';
  if (c === 'medium') return 'Confianza media';
  return 'Baja confianza';
}

function mapResult(r: ExtractionResult): UIResult {
  if (!r.extracted || r.confidence === 'low') {
    const codes = r.rejectedReasons?.length ? r.rejectedReasons : ['no_collection_data'];
    const infos = codes.map(c => REJECTION_MAP[c] ?? { msg: c, tip: '' });
    return {
      status: 'reject',
      reasons: infos.map(i => i.msg),
      tip: infos.map(i => i.tip).filter(Boolean).join(' '),
      usage: r.usage,
      description: r.description,
    };
  }
  const d = r.extracted;
  return {
    status: 'success',
    confidence: r.confidence,
    empresa: d.company,
    fecha: d.date,
    notas: d.notes,
    materials: d.materials.map(m => ({
      material: m.type,
      cantidad: m.quantity != null ? String(m.quantity) : null,
      unidad: m.unit,
    })),
    usage: r.usage,
    description: r.description,
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function apiExtractText(message: string): Promise<ExtractionResult> {
  const res = await fetch(`${API_BASE}/extract/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const json = await res.json();
  if (!res.ok && res.status !== 422) {
    throw new Error(json?.error?.message ?? res.statusText);
  }
  if (res.status === 422 && json?.data) return json.data as ExtractionResult;
  if (res.status === 422) {
    const code = json?.error?.code ?? 'no_collection_data';
    return { sessionId: '', inputType: 'text', confidence: 'low', extracted: null, rejectedReasons: [code] };
  }
  return json.data as ExtractionResult;
}

async function apiExtractFile(file: File, notes?: string): Promise<ExtractionResult> {
  const type = file.type.startsWith('video/') ? 'video' : 'image';

  const presignRes = await fetch(`${API_BASE}/extract/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: file.type }),
  });
  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => null);
    throw new Error(err?.error?.message ?? presignRes.statusText);
  }
  const { data: presign } = await presignRes.json() as { data: PresignResponse };

  const s3Res = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!s3Res.ok) throw new Error(`Error subiendo archivo: ${s3Res.status}`);

  const body: Record<string, unknown> = { sessionId: presign.sessionId, type };
  if (notes?.trim()) body['notes'] = notes.trim();

  const extractRes = await fetch(`${API_BASE}/extract/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await extractRes.json();
  if (!extractRes.ok && extractRes.status !== 422) {
    throw new Error(json?.error?.message ?? extractRes.statusText);
  }
  if (extractRes.status === 422 && json?.data) return json.data as ExtractionResult;
  if (extractRes.status === 422) {
    const code = json?.error?.code ?? 'no_collection_data';
    return { sessionId: '', inputType: type, confidence: 'low', extracted: null, rejectedReasons: [code] };
  }
  return json.data as ExtractionResult;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconText() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/>
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 16l-5-5L5 20"/>
    </svg>
  );
}

function IconVideo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5.5" width="13" height="13" rx="2"/><path d="M15.5 10l6-3.2v10.4l-6-3.2z"/>
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14"/><path d="M5 12h14"/>
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l9 16H3z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17"/>
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
    </svg>
  );
}

function IconSpin({ size = 17 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      style={{ animationDuration: '0.75s' }}
    >
      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.35)" strokeWidth="2.4"/>
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconSpinDark({ size = 17 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      style={{ animationDuration: '0.75s' }}
    >
      <circle cx="12" cy="12" r="9" stroke="rgba(0,0,0,0.15)" strokeWidth="2.4"/>
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconLeaf() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20c0-9 7-15 16-15 0 9-6 15-15 15-1 0-1 0-1 0z"/>
      <path d="M4 20c4-6 8-9 12-11"/>
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="1.5"/>
      <path d="M10 21v-3.5h4V21"/>
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="16" rx="2"/>
      <line x1="3.5" y1="10" x2="20.5" y2="10"/>
      <line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/>
    </svg>
  );
}

function IconNotes() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4"/>
      <line x1="8.5" y1="9" x2="15.5" y2="9"/><line x1="8.5" y1="13" x2="12.5" y2="13"/>
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExtractionDemo() {
  const [tab, setTab]               = useState<Tab>('texto');
  const [text, setText]             = useState('');
  const [imgFile, setImgFile]       = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgNotes, setImgNotes]     = useState('');
  const [imgNotesOpen, setImgNotesOpen] = useState(false);
  const [vidFile, setVidFile]       = useState<File | null>(null);
  const [vidNotes, setVidNotes]     = useState('');
  const [vidNotesOpen, setVidNotesOpen] = useState(false);
  const [phase, setPhase]           = useState<Phase>('idle');
  const [result, setResult]         = useState<UIResult | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [imgDragOver, setImgDragOver] = useState(false);
  const [vidDragOver, setVidDragOver] = useState(false);

  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  const canExtract = (): boolean => {
    if (tab === 'texto')  return text.trim().length > 0;
    if (tab === 'imagen') return !!imgFile;
    return !!vidFile;
  };

  const changeTab = (t: Tab) => {
    setTab(t);
    setPhase('idle');
    setResult(null);
  };

  const pickImg = (file: File) => {
    if (imgPreview) URL.revokeObjectURL(imgPreview);
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
    setResult(null);
    setPhase('idle');
  };

  const clearImg = () => {
    if (imgPreview) URL.revokeObjectURL(imgPreview);
    setImgFile(null);
    setImgPreview(null);
  };

  const pickVid = (file: File) => {
    setVidFile(file);
    setResult(null);
    setPhase('idle');
  };

  const clearVid = () => setVidFile(null);

  const runExtract = async () => {
    if (!canExtract() || phase === 'loading') return;
    setPhase('loading');
    setLoadingMsg(tab === 'texto' ? 'Extrayendo…' : 'Subiendo y extrayendo…');
    setResult(null);
    try {
      const r = tab === 'texto'
        ? await apiExtractText(text)
        : await apiExtractFile(
            tab === 'imagen' ? imgFile! : vidFile!,
            tab === 'imagen' ? imgNotes : vidNotes,
          );
      setResult(mapResult(r));
      setPhase('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      setResult({ status: 'reject', reasons: [msg] });
      setPhase('done');
    }
  };

  const tierCost = (requests: number) => requests * (result?.usage?.costUsd ?? 0);
  const tierBarPct = (requests: number) => Math.round((requests / TIERS[TIERS.length - 1].requests) * 100);

  return (
    <div className="p-6 md:p-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-black-heading tracking-tight leading-tight">
          Cargar recolección
        </h1>
        <p className="text-body-text text-sm mt-2 leading-relaxed">
          Extraé los datos de una recolección a partir de un mensaje, una foto o un video. Revisá el resultado antes de confirmar.
        </p>
      </div>

      {/* Dashboard: two columns */}
      <div className="flex gap-5 items-start flex-col lg:flex-row">

        {/* Left: input + result card */}
        <div className="flex-1 min-w-0">

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border-default mb-6">
            {([['texto', <IconText key="t" />, 'Texto'], ['imagen', <IconImage key="i" />, 'Imagen'], ['video', <IconVideo key="v" />, 'Video']] as [Tab, React.ReactNode, string][]).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => changeTab(id)}
                className={[
                  'inline-flex items-center gap-2 px-4 py-3 -mb-px font-bold text-[15px] border-b-2 transition-colors duration-150',
                  tab === id
                    ? 'text-[#4BAF47] border-[#4BAF47]'
                    : 'text-body-text border-transparent hover:text-black-heading',
                ].join(' ')}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Texto tab */}
          {tab === 'texto' && (
            <div>
              <textarea
                className="w-full resize-y min-h-[122px] p-4 border border-border-default rounded-input text-[14.5px] leading-relaxed text-black-heading bg-card outline-none focus:border-[#4BAF47] transition-colors"
                value={text}
                onChange={e => setText(e.target.value)}
                rows={4}
                placeholder={`Pegá el mensaje del recolector…\nej: Empresa ABC entregó 50kg de papel el 15/03`}
              />
              <div className="flex justify-between items-center mt-2">
                <button
                  className="text-sm font-bold text-[#4BAF47]"
                  onClick={() => setText(SAMPLE)}
                >
                  + Usar mensaje de ejemplo
                </button>
                <span className="text-xs text-[#B9B8B1] font-semibold">{text.length} caracteres</span>
              </div>
            </div>
          )}

          {/* Imagen tab */}
          {tab === 'imagen' && (
            <div>
              {!imgFile ? (
                <div
                  className={[
                    'border-[1.5px] border-dashed rounded-[10px] py-10 px-6 text-center cursor-pointer transition-colors',
                    imgDragOver
                      ? 'border-[#4BAF47] bg-[#D4EDDA]'
                      : 'border-border-default bg-green-light',
                  ].join(' ')}
                  onClick={() => imgInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setImgDragOver(true); }}
                  onDragLeave={() => setImgDragOver(false)}
                  onDrop={e => { e.preventDefault(); setImgDragOver(false); const f = e.dataTransfer.files[0]; if (f) pickImg(f); }}
                >
                  <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) pickImg(f); }}
                  />
                  <div className="w-[50px] h-[50px] rounded-full mx-auto mb-3 grid place-items-center bg-white text-[#4BAF47] shadow-card">
                    <IconUpload />
                  </div>
                  <div className="text-black-heading font-bold text-[14.5px]">Seleccioná una imagen JPG, PNG o WEBP</div>
                  <div className="text-body-text text-sm mt-1">Arrastrá el archivo o hacé clic para buscarlo</div>
                </div>
              ) : (
                <div className="border border-border-default rounded-[10px] p-4 flex gap-4 items-center bg-white">
                  {imgPreview && (
                    <img src={imgPreview} alt="preview" className="max-h-48 max-w-[200px] h-auto rounded object-cover border border-border-default" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14.5px] text-black-heading truncate">{imgFile.name}</div>
                    <div className="text-sm text-body-text mt-1">{formatFileSize(imgFile)} · imagen lista</div>
                    <button
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-body-text"
                      onClick={clearImg}
                    >
                      <IconClose /> Quitar
                    </button>
                  </div>
                </div>
              )}
              <NotesSection
                open={imgNotesOpen}
                setOpen={setImgNotesOpen}
                notes={imgNotes}
                setNotes={setImgNotes}
                placeholder="Ej: Empresa Verdesur, retiro del 15/06. El remito está incompleto."
              />
            </div>
          )}

          {/* Video tab */}
          {tab === 'video' && (
            <div>
              {!vidFile ? (
                <>
                  <div
                    className={[
                      'border-[1.5px] border-dashed rounded-[10px] py-10 px-6 text-center cursor-pointer transition-colors',
                      vidDragOver
                        ? 'border-[#4BAF47] bg-[#D4EDDA]'
                        : 'border-border-default bg-green-light',
                    ].join(' ')}
                    onClick={() => vidInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setVidDragOver(true); }}
                    onDragLeave={() => setVidDragOver(false)}
                    onDrop={e => { e.preventDefault(); setVidDragOver(false); const f = e.dataTransfer.files[0]; if (f) pickVid(f); }}
                  >
                    <input
                      ref={vidInputRef}
                      type="file"
                      accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) pickVid(f); }}
                    />
                    <div className="w-[50px] h-[50px] rounded-full mx-auto mb-3 grid place-items-center bg-white text-[#4BAF47] shadow-card">
                      <IconUpload />
                    </div>
                    <div className="text-black-heading font-bold text-[14.5px]">Seleccioná un video MP4, MOV, AVI o MKV</div>
                    <div className="text-body-text text-sm mt-1">Arrastrá el archivo o hacé clic para buscarlo</div>
                  </div>
                  <div className="text-sm text-body-text mt-2">Máx. 2 minutos</div>
                </>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-2 max-w-full bg-green-light text-[#4BAF47] font-bold text-sm px-4 py-2.5 rounded-full">
                    <IconVideo />
                    <span className="truncate max-w-[320px]">{vidFile.name}</span>
                    <button className="ml-1 inline-flex text-[#4BAF47]" onClick={clearVid}>
                      <IconClose />
                    </button>
                  </span>
                  <span className="text-sm text-body-text">{formatFileSize(vidFile)}</span>
                </div>
              )}
              <NotesSection
                open={vidNotesOpen}
                setOpen={setVidNotesOpen}
                notes={vidNotes}
                setNotes={setVidNotes}
                placeholder="Ej: Recolector Juan, turno mañana del 15/06. Menciona cartón y plástico."
              />
            </div>
          )}

          {/* Extract button */}
          <button
            className={[
              'w-full mt-5 py-[14px] px-5 rounded-input font-bold text-[15.5px] inline-flex items-center justify-center gap-2.5 transition-all',
              canExtract() && phase !== 'loading'
                ? 'bg-[#4BAF47] text-white hover:bg-[#3d9a3a] cursor-pointer'
                : 'bg-[#4BAF47] text-white opacity-50 cursor-not-allowed',
            ].join(' ')}
            disabled={!canExtract() || phase === 'loading'}
            onClick={runExtract}
          >
            {phase === 'loading' ? (
              <><IconSpin /> {loadingMsg}</>
            ) : 'Extraer'}
          </button>

          {/* Result panel */}
          <div className="mt-7">
            <div className="text-[12.5px] font-bold tracking-widest uppercase text-[#B9B8B1] mb-3">Extracción</div>

            {/* Loading skeleton */}
            {phase === 'loading' && (
              <div className="bg-white rounded-[7px] border-l-4 border-l-[#E3E3E3] shadow-[0_1px_4px_rgba(0,0,0,0.08)] p-6">
                <div className="flex items-center gap-3 mb-5 text-body-text font-semibold text-sm">
                  <span className="text-[#4BAF47]"><IconSpinDark /></span>
                  {loadingMsg}
                </div>
                <div className="space-y-3">
                  <div className="h-3 rounded bg-border-default animate-pulse" style={{ width: '78%' }} />
                  <div className="h-3 rounded bg-border-default animate-pulse" style={{ width: '92%', animationDelay: '0.14s' }} />
                  <div className="h-3 rounded bg-border-default animate-pulse" style={{ width: '64%', animationDelay: '0.28s' }} />
                  <div className="h-16 rounded-[6px] bg-bg-page border border-border-default animate-pulse mt-2" />
                </div>
              </div>
            )}

            {/* Empty state */}
            {phase === 'idle' && (
              <div className="border-[1.5px] border-dashed border-border-default bg-bg-page rounded-[8px] py-12 px-6 text-center">
                <div className="w-[52px] h-[52px] rounded-full mx-auto mb-4 grid place-items-center bg-green-light text-[#4BAF47]">
                  <IconLeaf />
                </div>
                <div className="text-body-text text-[14.5px] font-semibold">El resultado aparecerá aquí</div>
                <div className="text-[#B9B8B1] text-sm mt-1">Cargá un mensaje, una imagen o un video y presioná Extraer.</div>
              </div>
            )}

            {/* Reject card */}
            {phase === 'done' && result?.status === 'reject' && (
              <div className="bg-white rounded-[7px] border-l-4 border-l-[#D32F2F] shadow-[0_1px_4px_rgba(0,0,0,0.08)] p-6">
                <div className="flex items-center gap-2.5 mb-1 text-[#D32F2F]">
                  <IconWarning />
                  <h3 className="text-[16.5px] font-bold">No se pudo extraer</h3>
                </div>
                {result.reasons?.length && (
                  <ul className="mt-3 space-y-2.5">
                    {result.reasons.map((r, i) => (
                      <li key={i} className="flex gap-2.5 text-body-text text-[14.5px] leading-relaxed">
                        <span className="w-[5px] h-[5px] rounded-full bg-[#D32F2F] opacity-55 flex-shrink-0 mt-[9px]" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
                {result.tip && (
                  <div className="flex items-start gap-2 mt-4 p-3 rounded-[7px] bg-[#FFF8E1] text-[#7B5E00] text-sm font-semibold leading-relaxed">
                    <span className="text-[#F57F17] mt-0.5"><IconInfo /></span>
                    {result.tip}
                  </div>
                )}
                {result.description && (
                  <DescriptionBlock text={result.description} />
                )}
                {result.usage && (
                  <UsageRow usage={result.usage} />
                )}
              </div>
            )}

            {/* Success card */}
            {phase === 'done' && result?.status === 'success' && (
              <div className="bg-white rounded-[7px] border-l-4 border-l-[#4BAF47] shadow-[0_1px_4px_rgba(0,0,0,0.08)] p-6">
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <h3 className="text-[17px] font-extrabold text-black-heading tracking-tight">Resultado</h3>
                  <span
                    className="inline-flex items-center gap-1.5 font-bold text-[12.5px] px-3 py-1.5 rounded-full whitespace-nowrap"
                    style={{ background: confBg(result.confidence), color: confFg(result.confidence) }}
                  >
                    <span className="w-[7px] h-[7px] rounded-full bg-current flex-shrink-0" />
                    {confLabel(result.confidence)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7">
                  <DefRow icon={<IconBuilding />} label="Empresa" value={result.empresa} />
                  <DefRow icon={<IconCalendar />} label="Fecha" value={result.fecha} />
                  {result.notas && (
                    <div className="sm:col-span-2">
                      <DefRow icon={<IconNotes />} label="Notas" value={result.notas} />
                    </div>
                  )}
                </div>

                {result.description && (
                  <DescriptionBlock text={result.description} />
                )}

                {result.materials?.length ? (
                  <div className="mt-5 border border-border-default rounded-[7px] overflow-hidden">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-bg-page">
                          <th className="text-left text-body-text font-semibold text-[12.5px] uppercase tracking-wide py-2.5 px-4">Material</th>
                          <th className="text-right text-body-text font-semibold text-[12.5px] uppercase tracking-wide py-2.5 px-4">Cantidad</th>
                          <th className="text-right text-body-text font-semibold text-[12.5px] uppercase tracking-wide py-2.5 px-4">Unidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.materials.map((m, i) => (
                          <tr key={i} className="border-t border-border-default">
                            <td className="py-3 px-4 font-bold text-black-heading">
                              <span className="inline-flex items-center gap-2.5">
                                <span className="w-2 h-2 rounded-[2px] bg-[#4BAF47] opacity-85 flex-shrink-0" />
                                {m.material}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-black-heading tabular-nums">{m.cantidad ?? '—'}</td>
                            <td className="py-3 px-4 text-right text-body-text font-semibold">{m.unidad ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {result.usage && (
                  <UsageRow usage={result.usage} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: cost estimate card */}
        <div className="lg:w-[320px] w-full lg:border-l lg:border-border-default lg:pl-6 flex-shrink-0 flex flex-col gap-5">
          <div>
            <h2 className="text-[17px] font-extrabold text-black-heading tracking-tight mb-1.5">
              Estimación de costo a escala
            </h2>
            {result?.usage ? (
              <div className="flex items-center gap-2 flex-wrap text-sm text-body-text font-semibold">
                <span className="bg-green-light text-[#4BAF47] text-[11.5px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                  {result.usage.modelId}
                </span>
                {result.usage.inputTokens + result.usage.outputTokens} tokens/req
                &nbsp;·&nbsp;
                {formatCost(result.usage.costUsd)} / extracción
              </div>
            ) : (
              <p className="text-sm text-[#B9B8B1] italic">Ejecutá una extracción para ver el costo real del modelo.</p>
            )}
          </div>

          {/* Token breakdown */}
          <div className="flex items-center border border-border-default rounded-[8px] overflow-hidden">
            {[
              { label: 'Entrada', value: result?.usage?.inputTokens },
              { label: 'Salida',  value: result?.usage?.outputTokens },
              { label: 'Total',   value: result?.usage ? result.usage.inputTokens + result.usage.outputTokens : undefined, highlight: true },
            ].map((item, i) => (
              <React.Fragment key={item.label}>
                {i > 0 && <div className="w-px self-stretch bg-border-default" />}
                <div className="flex flex-col items-center px-4 py-2 gap-0.5 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-body-text">{item.label}</span>
                  {item.value != null ? (
                    <span className={`text-[15px] font-extrabold tabular-nums ${item.highlight ? 'text-[#4BAF47]' : 'text-black-heading'}`}>
                      {item.value}
                    </span>
                  ) : (
                    <span className="inline-block w-7 h-3.5 rounded bg-border-default animate-pulse" />
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Tier cards */}
          <div className="flex flex-col gap-2.5">
            {TIERS.map(tier => (
              <div
                key={tier.key}
                className={[
                  'border rounded-[10px] px-4 py-3.5',
                  tier.highlight
                    ? 'border-[#4BAF47] bg-green-light'
                    : 'border-border-default bg-bg-page',
                  !result?.usage ? 'opacity-55' : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-black-heading">{tier.label}</span>
                    <span className="text-[11.5px] font-semibold text-body-text"> / mes</span>
                  </div>
                  {result?.usage ? (
                    <span className={`text-[22px] font-extrabold tracking-tight tabular-nums leading-none ${tier.highlight ? 'text-[#4BAF47]' : 'text-black-heading'}`}>
                      {formatUsd(tierCost(tier.requests))}
                    </span>
                  ) : (
                    <span className="inline-block w-14 h-5 rounded bg-border-default animate-pulse" />
                  )}
                </div>
                <div className="mt-1">
                  {result?.usage ? (
                    <span className="text-[11.5px] text-body-text font-semibold">
                      {formatUsd(tierCost(tier.requests) / 30)} / día
                    </span>
                  ) : (
                    <span className="inline-block w-16 h-2.5 rounded bg-border-default animate-pulse" />
                  )}
                </div>
                <div className="h-[3px] bg-border-default rounded-full overflow-hidden mt-2.5">
                  <div
                    className="h-full bg-[#4BAF47] rounded-full transition-all duration-300"
                    style={{
                      width: result?.usage ? `${tierBarPct(tier.requests)}%` : '0%',
                      opacity: tier.highlight ? 1 : 0.45,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-[#B9B8B1] leading-relaxed mt-auto">
            {result?.usage
              ? 'Estimación basada en la última extracción real. Los costos pueden variar según longitud del mensaje o del archivo.'
              : 'Los valores se calculan automáticamente con el costo real devuelto por el modelo tras cada extracción.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotesSection({
  open, setOpen, notes, setNotes, placeholder,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  notes: string;
  setNotes: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="mt-3">
      <button
        className="inline-flex items-center gap-1.5 text-sm font-bold text-[#4BAF47] relative"
        onClick={() => setOpen(!open)}
      >
        <IconPlus />
        {open ? 'Ocultar contexto' : 'Agregar contexto'}
        {!open && notes.trim() && (
          <span className="w-[7px] h-[7px] rounded-full bg-[#4BAF47] flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="mt-2.5">
          <textarea
            className="w-full resize-y min-h-[66px] p-3 border border-border-default rounded-input text-[13.5px] leading-relaxed text-black-heading bg-card outline-none focus:border-[#4BAF47] transition-colors"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={placeholder}
            rows={2}
            maxLength={500}
          />
          <div className="text-right text-[11.5px] text-[#B9B8B1] font-semibold mt-1">{notes.length}/500</div>
        </div>
      )}
    </div>
  );
}

function DefRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline gap-3.5 py-3 border-t border-border-default">
      <div className="inline-flex items-center gap-1.5 text-body-text font-semibold text-[13.5px] w-28 flex-shrink-0">
        <span className="text-[#4BAF47]">{icon}</span>
        {label}
      </div>
      <div className={`font-semibold text-[14.5px] leading-relaxed ${value ? 'text-black-heading' : 'text-[#B9B8B1]'}`}>
        {value || '—'}
      </div>
    </div>
  );
}

function DescriptionBlock({ text }: { text: string }) {
  return (
    <div className="mt-4 p-3.5 bg-bg-page rounded-[7px] border border-border-default">
      <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-body-text mb-1.5">
        <span className="text-[#4BAF47]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </span>
        Descripción IA
      </div>
      <p className="text-sm text-body-text leading-relaxed italic">{text}</p>
    </div>
  );
}

function UsageRow({ usage }: { usage: ExtractionUsage }) {
  return (
    <div className="mt-3.5 text-[11.5px] text-[#B9B8B1] font-semibold tracking-wide">
      {usage.modelId} · {usage.inputTokens + usage.outputTokens} tokens · {formatCost(usage.costUsd)}
    </div>
  );
}
