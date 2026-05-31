import { count, eq } from 'drizzle-orm';
import { db, empresas, extracciones, recolecciones } from '@fundares/db';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from '@/components/charts/BarChart';
import { calcularMetricas } from '@/lib/metricas';
import { Recycle, Building2, AlertCircle, CheckCircle } from 'lucide-react';

export default async function AdminDashboardPage() {
  const database = db();

  const empresaCountResult = await database.select({ value: count() }).from(empresas);
  const pendientesCountResult = await database
    .select({ value: count() })
    .from(extracciones)
    .where(eq(extracciones.estado, 'pendiente'));
  const recoleccionesRows = await database
    .select({
      tipo_material: recolecciones.tipoMaterial,
      cantidad_kg: recolecciones.cantidadKg,
    })
    .from(recolecciones);
  const extraccionesRows = await database
    .select({ estado: extracciones.estado })
    .from(extracciones)
    .limit(200);

  const empresaCount = empresaCountResult[0]!;
  const pendientesCount = pendientesCountResult[0]!;

  const recoleccionesData = recoleccionesRows.map((row) => ({
    tipo_material: row.tipo_material,
    cantidad_kg: Number(row.cantidad_kg),
  }));

  const metricas = calcularMetricas(recoleccionesData);

  const porMaterial = Object.entries(
    recoleccionesData.reduce<Record<string, number>>((acc, row) => {
      acc[row.tipo_material] = (acc[row.tipo_material] ?? 0) + row.cantidad_kg;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }));

  const aprobadas = extraccionesRows.filter(
    (row) => row.estado === 'aprobado' || row.estado === 'corregido'
  ).length;
  const rechazadas = extraccionesRows.filter((row) => row.estado === 'rechazado').length;

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-56px)] overflow-y-auto">
      <h1 className="text-2xl font-bold text-black-heading">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total reciclado" value={`${metricas.total_kg} kg`} icon={Recycle} color="green" />
        <MetricCard label="Empresas activas" value={String(empresaCount.value)} icon={Building2} color="blue" />
        <MetricCard label="Pendientes validar" value={String(pendientesCount.value)} icon={AlertCircle} color="yellow" />
        <MetricCard label="Aprobadas" value={String(aprobadas)} sub={`${rechazadas} rechazadas`} icon={CheckCircle} color="green" />
      </div>

      <Card>
        <CardHeader><CardTitle>Reciclaje por material (total)</CardTitle></CardHeader>
        <CardBody>
          {porMaterial.length > 0
            ? <BarChart data={porMaterial} />
            : <p className="text-sm text-body-text/70 py-8 text-center">Sin datos aún</p>
          }
        </CardBody>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardBody className="text-center py-5">
            <p className="text-3xl font-bold text-primary-600">{metricas.co2_kg}</p>
            <p className="text-sm text-body-text mt-1">kg CO₂ evitado</p>
          </CardBody>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardBody className="text-center py-5">
            <p className="text-3xl font-bold text-blue-600">{metricas.agua_litros.toLocaleString()}</p>
            <p className="text-sm text-body-text mt-1">litros de agua ahorrados</p>
          </CardBody>
        </Card>
        <Card className="bg-yellow-50 dark:bg-yellow-900/20">
          <CardBody className="text-center py-5">
            <p className="text-3xl font-bold text-yellow-600">{metricas.arboles}</p>
            <p className="text-sm text-body-text mt-1">árboles equivalentes</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
