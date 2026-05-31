import * as XLSX from 'xlsx';
import type { Recoleccion, Empresa } from '@/types';
import { calcularMetricas } from './metricas';

type RecoleccionConEmpresa = Recoleccion & { empresa_nombre?: string | null };

function agruparPorMaterial(recolecciones: RecoleccionConEmpresa[]) {
  return recolecciones.reduce<Record<string, number>>((acc, r) => {
    acc[r.tipo_material] = (acc[r.tipo_material] ?? 0) + Number(r.cantidad_kg);
    return acc;
  }, {});
}

function agruparPorMes(recolecciones: RecoleccionConEmpresa[]) {
  return recolecciones.reduce<Record<string, number>>((acc, r) => {
    const mes = r.fecha_recoleccion.slice(0, 7);
    acc[mes] = (acc[mes] ?? 0) + Number(r.cantidad_kg);
    return acc;
  }, {});
}

function agruparPorEmpresa(recolecciones: RecoleccionConEmpresa[]) {
  return recolecciones.reduce<Record<string, number>>((acc, r) => {
    const nombre = r.empresa_nombre ?? r.empresa_id;
    acc[nombre] = (acc[nombre] ?? 0) + Number(r.cantidad_kg);
    return acc;
  }, {});
}

export function generarReporteExcel(
  empresa: Empresa,
  recolecciones: RecoleccionConEmpresa[],
  anio: number,
): Buffer {
  const todasLasEmpresas = empresa.id === 'all';
  const metricas = calcularMetricas(recolecciones);
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumen de métricas
  const resumenRows = [
    ['Reporte Fundares Recycling'],
    [`${todasLasEmpresas ? 'Alcance: Todas las empresas' : `Empresa: ${empresa.nombre}`}`],
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

  // Sheet 4 (solo all): Por empresa
  if (todasLasEmpresas) {
    const porEmpresa = agruparPorEmpresa(recolecciones);
    const empresaRows = [
      ['Empresa', 'Total (kg)'],
      ...Object.entries(porEmpresa).sort((a, b) => b[1] - a[1]).map(([nombre, kg]) => [nombre, Math.round(kg * 100) / 100]),
    ];
    const wsEmpresa = XLSX.utils.aoa_to_sheet(empresaRows);
    XLSX.utils.book_append_sheet(wb, wsEmpresa, 'Por Empresa');
  }

  // Sheet: Detalle de recolecciones
  const detalleHeader = todasLasEmpresas
    ? ['ID', 'Empresa', 'Material', 'Cantidad (kg)', 'Fecha', 'Validado por']
    : ['ID', 'Material', 'Cantidad (kg)', 'Fecha', 'Validado por'];

  const detalleRows = [
    detalleHeader,
    ...recolecciones.map(r => todasLasEmpresas
      ? [r.id, r.empresa_nombre ?? r.empresa_id, r.tipo_material, Number(r.cantidad_kg), r.fecha_recoleccion, r.validado_por ?? '']
      : [r.id, r.tipo_material, Number(r.cantidad_kg), r.fecha_recoleccion, r.validado_por ?? '']
    ),
  ];
  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleRows);
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buf);
}
