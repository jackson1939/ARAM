import * as XLSX from 'xlsx';
import type { Recoleccion, Empresa } from '@/types';
import { calcularMetricas } from './metricas';

function agruparPorMaterial(recolecciones: Recoleccion[]) {
  return recolecciones.reduce<Record<string, number>>((acc, r) => {
    acc[r.tipo_material] = (acc[r.tipo_material] ?? 0) + Number(r.cantidad_kg);
    return acc;
  }, {});
}

function agruparPorMes(recolecciones: Recoleccion[]) {
  return recolecciones.reduce<Record<string, number>>((acc, r) => {
    const mes = r.fecha_recoleccion.slice(0, 7);
    acc[mes] = (acc[mes] ?? 0) + Number(r.cantidad_kg);
    return acc;
  }, {});
}

export function generarReporteExcel(
  empresa: Empresa,
  recolecciones: Recoleccion[],
  anio: number,
): Buffer {
  const metricas = calcularMetricas(recolecciones);
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumen de métricas
  const resumenRows = [
    ['Reporte Fundares Recycling'],
    [`Empresa: ${empresa.nombre}`],
    [`Período: ${anio}`],
    [`Generado: ${new Date().toLocaleDateString('es-BO')}`],
    [],
    ['MÉTRICAS DE IMPACTO'],
    ['Métrica', 'Valor'],
    ['Total reciclado (kg)', metricas.total_kg],
    ['CO₂ evitado (kg)', metricas.co2_kg],
    ['Agua ahorrada (L)', metricas.agua_litros],
    ['Árboles equivalentes', metricas.arboles],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // Sheet 2: Por material
  const porMaterial = agruparPorMaterial(recolecciones);
  const materialRows = [
    ['Material', 'Total (kg)'],
    ...Object.entries(porMaterial).map(([mat, kg]) => [mat, Math.round(kg * 100) / 100]),
  ];
  const wsMaterial = XLSX.utils.aoa_to_sheet(materialRows);
  XLSX.utils.book_append_sheet(wb, wsMaterial, 'Por Material');

  // Sheet 3: Por mes
  const porMes = agruparPorMes(recolecciones);
  const mesRows = [
    ['Mes', 'Total (kg)'],
    ...Object.entries(porMes).sort().map(([mes, kg]) => [mes, Math.round(kg * 100) / 100]),
  ];
  const wsMes = XLSX.utils.aoa_to_sheet(mesRows);
  XLSX.utils.book_append_sheet(wb, wsMes, 'Por Mes');

  // Sheet 4: Detalle de recolecciones
  const detalleRows = [
    ['ID', 'Material', 'Cantidad (kg)', 'Fecha', 'Validado por'],
    ...recolecciones.map(r => [
      r.id,
      r.tipo_material,
      Number(r.cantidad_kg),
      r.fecha_recoleccion,
      r.validado_por ?? '',
    ]),
  ];
  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleRows);
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buf);
}
