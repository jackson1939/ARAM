'use client';

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download, ArrowLeft, Loader2 } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedRow {
  _row: number;
  fecha: string;
  tipo_material: string;
  cantidad_kg: number;
  _valid: boolean;
  _error?: string;
}

type Phase = 'upload' | 'preview' | 'uploading' | 'done';

interface DoneResult { ok: number; errors: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFecha(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).trim();

  // Excel serial number
  const n = Number(s);
  if (!isNaN(n) && n > 30000 && n < 100000) {
    const d = new Date((n - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }

  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;

  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const attempt = new Date(s);
    if (!isNaN(attempt.getTime())) return attempt.toISOString().slice(0, 10);
  }

  return null;
}

const COL_FECHA     = ['fecha', 'date', 'fecha_recoleccion', 'fecha recoleccion'];
const COL_MATERIAL  = ['material', 'tipo_material', 'tipo material', 'tipo', 'materiales'];
const COL_CANTIDAD  = ['cantidad_kg', 'cantidad', 'kg', 'cantidad (kg)', 'cantidad(kg)', 'peso', 'peso_kg'];

function findKey(obj: Record<string, unknown>, candidates: string[]): unknown {
  for (const c of candidates) {
    const found = Object.keys(obj).find(k => k.toLowerCase().trim() === c);
    if (found !== undefined) return obj[found];
  }
  return undefined;
}

function normalizeRows(raw: Record<string, unknown>[]): ParsedRow[] {
  return raw.map((r, i) => {
    const rawFecha    = findKey(r, COL_FECHA);
    const rawMaterial = findKey(r, COL_MATERIAL);
    const rawCantidad = findKey(r, COL_CANTIDAD);

    const fecha = parseFecha(rawFecha);
    const material = rawMaterial !== undefined ? String(rawMaterial).trim().toLowerCase() : '';
    const cantidad = rawCantidad !== undefined ? parseFloat(String(rawCantidad)) : NaN;

    if (!fecha)                     return { _row: i + 2, fecha: String(rawFecha ?? ''), tipo_material: material, cantidad_kg: cantidad, _valid: false, _error: 'Fecha inválida o ausente' };
    if (!material)                   return { _row: i + 2, fecha, tipo_material: '',       cantidad_kg: cantidad, _valid: false, _error: 'Material ausente' };
    if (isNaN(cantidad) || cantidad <= 0) return { _row: i + 2, fecha, tipo_material: material, cantidad_kg: cantidad, _valid: false, _error: 'Cantidad inválida' };

    return { _row: i + 2, fecha, tipo_material: material, cantidad_kg: cantidad, _valid: true };
  });
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['fecha',       'material', 'cantidad_kg'],
    ['2025-06-01',  'papel',    120          ],
    ['2025-06-03',  'plástico', 85           ],
    ['2025-06-05',  'cartón',   200          ],
  ]);
  ws['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Recolecciones');
  XLSX.writeFile(wb, 'plantilla-recolecciones.xlsx');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UploadZone({ onParsed }: { onParsed: (rows: ParsedRow[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]!];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[];
        if (json.length === 0) { setParseError('El archivo está vacío o no tiene datos.'); return; }
        onParsed(normalizeRows(json));
      } catch {
        setParseError('No se pudo leer el archivo. Verificá que sea .csv o .xlsx válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [onParsed]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="p-6 space-y-5">
      {/* Format hint */}
      <div className="rounded-[10px] border border-border-default p-4" style={{ background: 'var(--alt)' }}>
        <p className="text-[12px] font-bold text-black-heading mb-2">Formato esperado</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { col: 'fecha',        hint: '2025-06-01', req: true  },
            { col: 'material',     hint: 'papel',      req: true  },
            { col: 'cantidad_kg',  hint: '120',        req: true  },
          ].map(c => (
            <div key={c.col} className="rounded-[7px] border border-border-default p-2" style={{ background: 'var(--card)' }}>
              <p className="font-mono text-[10px] font-bold text-[var(--green)] mb-0.5">{c.col}</p>
              <p className="text-[11px] text-muted-text">{c.hint}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-text mt-3">
          Fechas aceptadas: <span className="font-mono">YYYY-MM-DD</span> · <span className="font-mono">DD/MM/YYYY</span> · serial Excel
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          'border-2 border-dashed rounded-[12px] p-10 flex flex-col items-center gap-3 cursor-pointer transition-all',
          dragging
            ? 'border-[var(--green)] bg-[var(--gl)]'
            : 'border-border-default hover:border-[var(--green)] hover:bg-[var(--gl)]',
        ].join(' ')}
      >
        <div className="w-12 h-12 rounded-[12px] grid place-items-center" style={{ background: 'var(--gl)' }}>
          <Upload className="w-5 h-5" style={{ color: 'var(--green)' }} />
        </div>
        <div className="text-center">
          <p className="font-bold text-[14px] text-black-heading">Arrastrá tu archivo aquí</p>
          <p className="text-[12px] text-muted-text mt-1">o hacé clic para seleccionar · .csv · .xlsx · .xls</p>
        </div>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onInputChange} />
      </div>

      {parseError && (
        <div className="flex items-start gap-2.5 rounded-[8px] px-4 py-3 text-[12.5px]" style={{ background: 'var(--rust-wash)', color: 'var(--rust)' }}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {parseError}
        </div>
      )}

      {/* Template download */}
      <button
        onClick={downloadTemplate}
        className="inline-flex items-center gap-2 text-[12.5px] font-semibold transition-colors hover:text-[var(--green)]"
        style={{ color: 'var(--bt)' }}
      >
        <Download className="w-3.5 h-3.5" />
        Descargar plantilla Excel
      </button>
    </div>
  );
}

function PreviewTable({ rows, onConfirm, onBack, uploading }: {
  rows: ParsedRow[];
  onConfirm: () => void;
  onBack: () => void;
  uploading: boolean;
}) {
  const valid   = rows.filter(r => r._valid);
  const invalid = rows.filter(r => !r._valid);

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar */}
      <div className="px-6 py-3 border-b border-border-default flex items-center gap-4 flex-wrap" style={{ background: 'var(--alt)' }}>
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: 'var(--green)' }}>
          <CheckCircle2 className="w-4 h-4" /> {valid.length} válidas
        </span>
        {invalid.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: 'var(--rust)' }}>
            <XCircle className="w-4 h-4" /> {invalid.length} con error (se omitirán)
          </span>
        )}
        <span className="text-[11px] text-muted-text">{rows.length} filas totales</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0" style={{ background: 'var(--card)', zIndex: 1 }}>
            <tr className="border-b border-border-default">
              <th className="text-left px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-text w-10">#</th>
              <th className="text-left px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-text">Fecha</th>
              <th className="text-left px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-text">Material</th>
              <th className="text-right px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-text">Cantidad kg</th>
              <th className="text-center px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-text w-24">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row._row}
                className="border-b border-border-default"
                style={{ background: row._valid ? undefined : 'var(--rust-wash)' }}
              >
                <td className="px-4 py-2.5 font-mono text-[11px] text-muted-text">{row._row}</td>
                <td className="px-3 py-2.5 font-mono text-[12px] text-black-heading">{row.fecha || '—'}</td>
                <td className="px-3 py-2.5 text-[12.5px] text-black-heading capitalize">{row.tipo_material || '—'}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[12px] font-semibold text-black-heading tabular-nums">
                  {isNaN(row.cantidad_kg) ? '—' : row.cantidad_kg.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {row._valid
                    ? <CheckCircle2 className="w-4 h-4 mx-auto" style={{ color: 'var(--green)' }} />
                    : (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold" style={{ color: 'var(--rust)' }}>
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        {row._error}
                      </span>
                    )
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-border-default flex items-center justify-between gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          disabled={uploading}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-body-text hover:text-black-heading transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <button
          onClick={onConfirm}
          disabled={uploading || valid.length === 0}
          className="inline-flex items-center gap-2 font-bold text-[13.5px] px-5 py-2.5 rounded-[9px] text-white transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--green)' }}
        >
          {uploading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
            : <><Upload className="w-4 h-4" /> Enviar {valid.length} recolección{valid.length !== 1 ? 'es' : ''}</>
          }
        </button>
      </div>
    </div>
  );
}

function DoneScreen({ result, onClose }: { result: DoneResult; onClose: () => void }) {
  return (
    <div className="p-8 flex flex-col items-center text-center gap-5">
      <div className="w-16 h-16 rounded-full grid place-items-center" style={{ background: 'var(--gl)' }}>
        <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--green)' }} />
      </div>
      <div>
        <p className="font-display font-extrabold text-[22px] text-black-heading tracking-tight">¡Carga enviada!</p>
        <p className="text-[14px] text-body-text mt-2 max-w-[280px]">
          Las recolecciones quedaron en cola para que el equipo de Fundares las valide.
        </p>
      </div>
      <div className="flex gap-4">
        <div className="rounded-[10px] border border-border-default px-5 py-4 text-center" style={{ background: 'var(--gl)' }}>
          <p className="font-display font-black text-[28px] leading-none" style={{ color: 'var(--green)' }}>{result.ok}</p>
          <p className="text-[12px] font-semibold text-muted-text mt-1">enviadas</p>
        </div>
        {result.errors > 0 && (
          <div className="rounded-[10px] border border-border-default px-5 py-4 text-center" style={{ background: 'var(--rust-wash)' }}>
            <p className="font-display font-black text-[28px] leading-none" style={{ color: 'var(--rust)' }}>{result.errors}</p>
            <p className="text-[12px] font-semibold text-muted-text mt-1">con error</p>
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        className="font-bold text-[13.5px] px-6 py-2.5 rounded-[9px] transition-all hover:-translate-y-px"
        style={{ background: 'var(--bk)', color: 'var(--bg)' }}
      >
        Cerrar
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function BulkUploadDrawer({ onClose }: Props) {
  const [phase,  setPhase]  = useState<Phase>('upload');
  const [rows,   setRows]   = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<DoneResult | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleParsed(parsed: ParsedRow[]) {
    setRows(parsed);
    setPhase('preview');
  }

  async function handleConfirm() {
    const valid = rows.filter(r => r._valid);
    if (!valid.length) return;
    setUploading(true);
    try {
      const res  = await fetch('/api/extracciones/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filas: valid.map(r => ({
            fecha: r.fecha,
            tipo_material: r.tipo_material,
            cantidad_kg: r.cantidad_kg,
          })),
        }),
      });
      const json = await res.json() as DoneResult;
      setResult(json);
      setPhase('done');
    } catch {
      setResult({ ok: 0, errors: valid.length });
      setPhase('done');
    } finally {
      setUploading(false);
    }
  }

  if (phase === 'upload') return <UploadZone onParsed={handleParsed} />;
  if (phase === 'preview') return (
    <PreviewTable
      rows={rows}
      onConfirm={handleConfirm}
      onBack={() => setPhase('upload')}
      uploading={uploading}
    />
  );
  if (phase === 'done' && result) return <DoneScreen result={result} onClose={onClose} />;

  return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--green)' }} />
    </div>
  );
}
