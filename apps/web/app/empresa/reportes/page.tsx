'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function EmpresaReportesPage() {
  const [anio,      setAnio]      = useState(new Date().getFullYear());
  const [generando, setGenerando] = useState(false);

  async function handleDescargar() {
    setGenerando(true);
    const res = await fetch(`/api/reporte?anio=${anio}`);
    if (!res.ok) { setGenerando(false); return; }
    const blob = await res.blob();
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `mi-reporte-${anio}.pdf`;
    a.click();
    setGenerando(false);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-black-heading">Mis reportes</h1>

      <Card>
        <CardHeader><CardTitle>Reporte anual PDF</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-body-text">
            Descarga el reporte completo de reciclaje de tu empresa para el año seleccionado.
            Incluye métricas de impacto ambiental, desglose por material y comparativa mensual.
          </p>
          <div>
            <label className="text-xs text-body-text mb-1 block">Año</label>
            <input
              type="number" value={anio} onChange={e => setAnio(Number(e.target.value))}
              min={2020} max={new Date().getFullYear()}
              className="w-full border border-border-default rounded-lg px-3 py-2 text-sm  "
            />
          </div>
          <Button onClick={handleDescargar} disabled={generando} className="w-full">
            <Download className="w-4 h-4" />
            {generando ? 'Generando PDF…' : 'Descargar reporte'}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
