'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab   = 'texto' | 'imagen' | 'video';
type Phase = 'input' | 'extracting' | 'review' | 'saved';

interface MaterialRow { tipo: string; cantidad: string; unidad: string; }
interface EmpresaOption { id: string; nombre: string; }

interface ExtractionResult {
  sessionId: string;
  inputType: 'text' | 'image' | 'video';
  confidence: 'high' | 'medium' | 'low';
  extracted: {
    company: string | null;
    date: string | null;
    materials: { type: string; quantity: number | null; unit: 'kg' | 'unit' | null }[];
    notes: string | null;
  } | null;
  rejectedReasons?: string[];
  description?: string;
}

// ── Identification service client ─────────────────────────────────────────────

const API_BASE = 'https://um5iwhzmob.execute-api.us-east-1.amazonaws.com/api/v1';

async function extractText(message: string): Promise<ExtractionResult> {
  const res  = await fetch(`${API_BASE}/extract/text`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const json = await res.json();
  if (!res.ok && res.status !== 422) throw new Error(json?.error?.message ?? res.statusText);
  if (res.status === 422) return json?.data ?? { sessionId: '', inputType: 'text', confidence: 'low', extracted: null, rejectedReasons: [json?.error?.code ?? 'no_collection_data'] };
  return json.data as ExtractionResult;
}

async function extractFile(file: File, notes?: string): Promise<ExtractionResult> {
  const type = file.type.startsWith('video/') ? 'video' : 'image';
  const presignRes = await fetch(`${API_BASE}/extract/presign`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: file.type }),
  });
  if (!presignRes.ok) throw new Error('Error al obtener URL de subida');
  const { data: presign } = await presignRes.json() as { data: { sessionId: string; uploadUrl: string } };
  const s3Res = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!s3Res.ok) throw new Error(`Error subiendo archivo: ${s3Res.status}`);
  const body: Record<string, unknown> = { sessionId: presign.sessionId, type };
  if (notes?.trim()) body.notes = notes.trim();
  const extractRes = await fetch(`${API_BASE}/extract/media`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const json = await extractRes.json();
  if (!extractRes.ok && extractRes.status !== 422) throw new Error(json?.error?.message ?? extractRes.statusText);
  if (extractRes.status === 422) return json?.data ?? { sessionId: '', inputType: type, confidence: 'low', extracted: null, rejectedReasons: [json?.error?.code ?? 'no_collection_data'] };
  return json.data as ExtractionResult;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function confLabel(c: string) { return c === 'high' ? 'Alta confianza' : c === 'medium' ? 'Confianza media' : 'Baja confianza'; }
function confColor(c: string) { return c === 'high' ? 'text-[#4BAF47] bg-[#EDF7ED]' : c === 'medium' ? 'text-[#F57F17] bg-[#FFF8E1]' : 'text-[#D32F2F] bg-[#FBEAEA]'; }
function today() { return new Date().toISOString().slice(0, 10); }

// ── Component ──────────────────────────────────────────────────────────────────

export function NuevaRecoleccionForm({ onSaved }: { onSaved?: () => void }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.rol === 'admin';

  const [phase,    setPhase]    = useState<Phase>('input');
  const [tab,      setTab]      = useState<Tab>('texto');
  const [text,     setText]     = useState('');
  const [file,     setFile]     = useState<File | null>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [notes,    setNotes]    = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // Review/edit state
  const [empresaId,   setEmpresaId]   = useState('');
  const [fecha,       setFecha]       = useState(today());
  const [materiales,  setMateriales]  = useState<MaterialRow[]>([]);
  const [notasEdit,   setNotasEdit]   = useState('');
  const [confianza,   setConfianza]   = useState('medium');
  const [saving,      setSaving]      = useState(false);

  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/empresas')
      .then(r => r.json())
      .then((j: { data: EmpresaOption[] }) => setEmpresas(j.data ?? []))
      .catch(() => {});
  }, [isAdmin]);

  function pickFile(f: File) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null);
  }

  function changeTab(t: Tab) { setTab(t); setFile(null); setPreview(null); setError(null); }

  function canExtract() {
    return tab === 'texto' ? text.trim().length > 0 : !!file;
  }

  async function handleExtract() {
    if (!canExtract()) return;
    setPhase('extracting');
    setError(null);
    try {
      const result = tab === 'texto'
        ? await extractText(text)
        : await extractFile(file!, notes);

      if (!result.extracted || result.confidence === 'low') {
        const reason = result.rejectedReasons?.[0] ?? 'no_collection_data';
        setError(reason === 'no_collection_data'
          ? 'No se encontraron datos de recolección. Intentá con un mensaje más detallado.'
          : reason === 'not_a_collection_document'
          ? 'El contenido no corresponde a una recolección de materiales.'
          : 'Confianza demasiado baja. Intentá con información más clara.');
        setPhase('input');
        return;
      }

      const d = result.extracted;
      setFecha(d.date ?? today());
      setNotasEdit(d.notes ?? '');
      setConfianza(result.confidence);
      setMateriales(
        d.materials.length > 0
          ? d.materials.map(m => ({ tipo: m.type, cantidad: m.quantity != null ? String(m.quantity) : '', unidad: m.unit ?? 'kg' }))
          : [{ tipo: '', cantidad: '', unidad: 'kg' }]
      );

      // Auto-match empresa by name
      if (!isAdmin && session?.user?.empresaId) {
        setEmpresaId(session.user.empresaId);
      } else if (isAdmin && d.company) {
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const extracted = normalize(d.company);
        const match = empresas.find(e => {
          const nombre = normalize(e.nombre);
          return nombre === extracted || nombre.includes(extracted) || extracted.includes(nombre);
        });
        if (match) setEmpresaId(match.id);
      }

      setPhase('review');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
      setPhase('input');
    }
  }

  function addMaterial() { setMateriales(prev => [...prev, { tipo: '', cantidad: '', unidad: 'kg' }]); }
  function removeMaterial(i: number) { setMateriales(prev => prev.filter((_, idx) => idx !== i)); }
  function updateMaterial(i: number, field: keyof MaterialRow, val: string) {
    setMateriales(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m));
  }

  async function handleSave() {
    const empId = isAdmin ? empresaId : (session?.user?.empresaId ?? '');
    if (!empId) { toast.error('Seleccioná una empresa'); return; }
    const validMats = materiales.filter(m => m.tipo.trim());
    if (!validMats.length) { toast.error('Agregá al menos un material'); return; }
    if (!fecha) { toast.error('La fecha es requerida'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/extracciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: text || undefined,
          empresa_id: empId,
          materiales: validMats.map(m => ({ tipo: m.tipo.trim(), cantidad_kg: parseFloat(m.cantidad) || 0, unidad: m.unidad || null })),
          fecha,
          notas: notasEdit || undefined,
          confianza,
        }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        toast.error(j.error ?? 'Error al guardar');
        return;
      }
      toast.success('Recolección creada correctamente');
      setPhase('saved');
      onSaved?.();
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  }

  function reset() {
    setPhase('input'); setText(''); setFile(null); setPreview(null);
    setNotes(''); setError(null); setMateriales([]); setFecha(today());
  }

  // ── Saved state ────────────────────────────────────────────────────────────

  if (phase === 'saved') {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-light grid place-items-center mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4BAF47" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h3 className="text-xl font-extrabold text-black-heading mb-2">Recolección creada</h3>
        <p className="text-sm text-body-text mb-6">Quedó en estado pendiente de validación por el administrador.</p>
        <button onClick={reset}
          className="bg-[#4BAF47] hover:bg-[#3d9a3a] text-white font-bold px-5 py-2.5 rounded-[9px] text-sm transition-colors">
          Crear otra recolección
        </button>
      </div>
    );
  }

  // ── Review / edit ──────────────────────────────────────────────────────────

  if (phase === 'review') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${confColor(confianza)}`}>
              {confLabel(confianza)}
            </span>
            <span className="text-[12px] text-body-text">Revisá y ajustá los datos antes de guardar.</span>
          </div>

          {/* Empresa */}
          {isAdmin ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-semibold text-body-text">
                  Empresa <span className="text-[#D32F2F]">*</span>
                </label>
                {empresaId && (
                  <span className="text-[11px] font-bold text-[#4BAF47] bg-green-light px-2 py-0.5 rounded-full">
                    ✓ Detectada automáticamente
                  </span>
                )}
              </div>
              <select value={empresaId} onChange={e => setEmpresaId(e.target.value)}
                className={`w-full border rounded-[9px] px-3 py-2.5 text-sm bg-card outline-none transition-colors ${!empresaId ? 'border-[#D32F2F]' : 'border-[#4BAF47]'}`}>
                <option value="">Seleccioná una empresa…</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              {!empresaId && (
                <p className="text-[11px] text-[#D32F2F] mt-1">No se encontró coincidencia — seleccioná manualmente</p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-[12px] font-semibold text-body-text mb-1">Empresa</label>
              <p className="text-sm font-semibold text-black-heading">{empresas.find(e => e.id === empresaId)?.nombre ?? session?.user?.empresaId ?? '—'}</p>
            </div>
          )}

          {/* Fecha */}
          <div>
            <label className="block text-[12px] font-semibold text-body-text mb-1.5">Fecha <span className="text-[#D32F2F]">*</span></label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full border border-border-default rounded-[9px] px-3 py-2.5 text-sm bg-card outline-none focus:border-[#4BAF47] transition-colors" />
          </div>

          {/* Materiales */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-semibold text-body-text">Materiales <span className="text-[#D32F2F]">*</span></label>
              <button onClick={addMaterial}
                className="text-[11px] font-bold text-[#4BAF47] hover:underline">
                + Agregar fila
              </button>
            </div>
            <div className="border border-border-default rounded-[9px] overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_90px_32px] bg-bg-page px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-body-text">
                <span>Material</span><span className="text-right">Cantidad</span><span className="text-right">Unidad</span><span />
              </div>
              {materiales.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_90px_32px] gap-1 px-2 py-1.5 border-t border-border-default items-center">
                  <input value={m.tipo} onChange={e => updateMaterial(i, 'tipo', e.target.value)}
                    className="border border-border-default rounded-[6px] px-2 py-1.5 text-[12px] bg-card text-black-heading outline-none focus:border-[#4BAF47] w-full"
                    placeholder="papel, plástico…" />
                  <input type="number" min="0" step="0.1" value={m.cantidad} onChange={e => updateMaterial(i, 'cantidad', e.target.value)}
                    className="border border-border-default rounded-[6px] px-2 py-1.5 text-[12px] bg-card text-black-heading text-right outline-none focus:border-[#4BAF47] w-full" />
                  <select value={m.unidad} onChange={e => updateMaterial(i, 'unidad', e.target.value)}
                    className="border border-border-default rounded-[6px] px-2 py-1.5 text-[12px] bg-card text-black-heading outline-none focus:border-[#4BAF47] w-full">
                    <option value="kg">kg</option>
                    <option value="unit">unid.</option>
                  </select>
                  <button onClick={() => removeMaterial(i)} disabled={materiales.length === 1}
                    className="w-7 h-7 flex items-center justify-center text-body-text hover:text-[#D32F2F] disabled:opacity-30 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-[12px] font-semibold text-body-text mb-1.5">Notas</label>
            <textarea value={notasEdit} onChange={e => setNotasEdit(e.target.value)} rows={2}
              className="w-full border border-border-default rounded-[9px] px-3 py-2.5 text-sm bg-card text-black-heading outline-none focus:border-[#4BAF47] transition-colors resize-none"
              placeholder="Observaciones adicionales…" />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 p-4 border-t border-border-default flex-shrink-0">
          <button onClick={() => setPhase('input')}
            className="flex-none border border-border-default text-body-text font-semibold px-4 py-2.5 rounded-[9px] text-sm hover:bg-bg-page transition-colors">
            ← Volver
          </button>
          <button onClick={handleSave} disabled={saving || (isAdmin && !empresaId)}
            className="flex-1 bg-[#4BAF47] hover:bg-[#3d9a3a] text-white font-bold py-2.5 rounded-[9px] text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Guardando…' : 'Crear recolección'}
          </button>
        </div>
      </div>
    );
  }

  // ── Input phase ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border-default">
          {([['texto', 'Texto'], ['imagen', 'Imagen'], ['video', 'Video']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => changeTab(id)}
              className={[
                'px-4 py-2.5 -mb-px text-sm font-bold border-b-2 transition-colors',
                tab === id ? 'text-[#4BAF47] border-[#4BAF47]' : 'text-body-text border-transparent hover:text-black-heading',
              ].join(' ')}>
              {label}
            </button>
          ))}
        </div>

        {/* Texto */}
        {tab === 'texto' && (
          <textarea value={text} onChange={e => setText(e.target.value)} rows={6}
            className="w-full resize-none border border-border-default rounded-[9px] px-4 py-3 text-sm text-black-heading bg-card outline-none focus:border-[#4BAF47] transition-colors leading-relaxed"
            placeholder={`Pegá el mensaje del recolector…\nej: Empresa Verdesur entregó 50 kg de papel el 15/03`} />
        )}

        {/* Imagen / Video */}
        {(tab === 'imagen' || tab === 'video') && (
          <div className="space-y-3">
            {!file ? (
              <div
                className={`border-[1.5px] border-dashed rounded-[10px] py-10 px-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-[#4BAF47] bg-[#EDF7ED]' : 'border-border-default bg-bg-page hover:border-[#4BAF47]'}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
              >
                <input ref={fileRef} type="file" className="hidden"
                  accept={tab === 'imagen' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/quicktime,video/x-msvideo,video/x-matroska'}
                  onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
                <div className="w-12 h-12 rounded-full mx-auto mb-3 grid place-items-center bg-card text-[#4BAF47]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>
                  </svg>
                </div>
                <p className="text-sm font-bold text-black-heading">
                  {tab === 'imagen' ? 'Seleccioná una imagen JPG, PNG o WEBP' : 'Seleccioná un video MP4, MOV, AVI o MKV'}
                </p>
                <p className="text-xs text-body-text mt-1">Arrastrá o hacé clic para buscar</p>
              </div>
            ) : (
              <div className="border border-border-default rounded-[10px] p-3 flex gap-3 items-center bg-card">
                {preview && <img src={preview} alt="" className="w-16 h-16 rounded object-cover border border-border-default flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-black-heading truncate">{file.name}</p>
                  <p className="text-xs text-body-text mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={clearFile} className="text-body-text hover:text-black-heading p-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
                  </svg>
                </button>
              </div>
            )}
            <div>
              <button onClick={() => setNotes(n => n ? '' : ' ')}
                className="text-xs font-semibold text-[#4BAF47]">
                {notes.trim() ? '− Ocultar contexto' : '+ Agregar contexto (opcional)'}
              </button>
              {notes !== '' && (
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500}
                  className="mt-2 w-full border border-border-default rounded-[9px] px-3 py-2 text-sm bg-card text-black-heading outline-none focus:border-[#4BAF47] transition-colors resize-none"
                  placeholder="Ej: Empresa Verdesur, retiro del 15/06…" />
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-[9px] bg-[#FBEAEA] text-[#D32F2F] text-sm font-semibold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <path d="M12 3l9 16H3z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r=".5" fill="currentColor"/>
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Extract button */}
      <div className="p-4 border-t border-border-default flex-shrink-0">
        <button onClick={handleExtract} disabled={!canExtract() || phase === 'extracting'}
          className="w-full py-3 bg-[#4BAF47] hover:bg-[#3d9a3a] text-white font-bold rounded-[9px] text-[15px] inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {phase === 'extracting' ? (
            <>
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animationDuration: '0.75s' }}>
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.35)" strokeWidth="2.4"/>
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
              </svg>
              {tab === 'texto' ? 'Extrayendo…' : 'Subiendo y extrayendo…'}
            </>
          ) : 'Extraer y continuar →'}
        </button>
      </div>
    </div>
  );
}
