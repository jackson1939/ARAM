'use client';

import { Lightbulb, TrendingUp, TrendingDown, AlertCircle, Star, Leaf, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { MetricasImpacto } from '@/types';

interface DashData {
  metricas: MetricasImpacto;
  series: { mes: string; kg: number }[];
  distribucion: Record<string, number>;
}

type TipType = 'success' | 'info' | 'warning' | 'action';

interface Tip {
  type: TipType;
  icon: React.ReactNode;
  title: string;
  body: string;
}

const MATERIALES_COMUNES = ['plastico', 'plástico', 'papel', 'vidrio', 'metal', 'carton', 'cartón'];
const MATERIALES_DISPLAY: Record<string, string> = {
  plastico: 'plástico', plástico: 'plástico',
  papel: 'papel', vidrio: 'vidrio', metal: 'metal',
  carton: 'cartón', cartón: 'cartón', electronico: 'electrónico', organico: 'orgánico',
};

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ')[0];
}

function generarTips(data: DashData): Tip[] {
  const tips: Tip[] = [];
  const { metricas, series, distribucion } = data;
  const materialesActivos = Object.keys(distribucion).map(normalize);

  // 1 — Sin datos aún
  if (metricas.total_kg === 0) {
    tips.push({
      type: 'action',
      icon: <Package className="w-4 h-4" />,
      title: 'Registrá tu primera recolección',
      body: 'Aún no tenés recolecciones validadas. Enviá tus datos por WhatsApp o usá el formulario del panel para empezar a ver tu impacto ambiental.',
    });
    return tips;
  }

  // 2 — Tendencia mensual (últimos 3 meses con datos)
  const mesesConDatos = series.filter(s => s.kg > 0);
  const ultimos3 = series.slice(-3);
  if (ultimos3.length === 3) {
    const [m1, m2, m3] = ultimos3.map(s => s.kg);
    if (m3 > 0 && m2 > 0 && m3 > m2 && m2 >= m1) {
      const pct = Math.round(((m3 - m1) / (m1 || 1)) * 100);
      tips.push({
        type: 'success',
        icon: <TrendingUp className="w-4 h-4" />,
        title: '¡Tu reciclaje está creciendo!',
        body: `Tus recolecciones aumentaron un ${pct}% en los últimos 3 meses. Mantené la frecuencia para maximizar tu impacto ambiental.`,
      });
    } else if (m3 < m2 && m2 <= m1 && mesesConDatos.length >= 3) {
      tips.push({
        type: 'warning',
        icon: <TrendingDown className="w-4 h-4" />,
        title: 'Tu reciclaje bajó los últimos meses',
        body: 'Las recolecciones disminuyeron en los últimos 3 meses. Revisá si el recolector está pasando con regularidad o si hay materiales acumulados sin separar.',
      });
    }
  }

  // 3 — Sin recolección el último mes
  const mesActual = new Date().toISOString().slice(0, 7);
  const ultimoMes = series.find(s => s.mes === mesActual);
  if (ultimoMes?.kg === 0 && metricas.total_kg > 0) {
    tips.push({
      type: 'action',
      icon: <AlertCircle className="w-4 h-4" />,
      title: 'Sin recolecciones este mes',
      body: 'No tenés recolecciones registradas este mes. Coordiná con el recolector para no perder continuidad en tu historial de reciclaje.',
    });
  }

  // 4 — Material dominante (> 70% del total)
  const totalKg = Object.values(distribucion).reduce((s, v) => s + v, 0);
  const [matDominante, kgDominante] = Object.entries(distribucion)
    .sort((a, b) => b[1] - a[1])[0] ?? [];
  if (matDominante && totalKg > 0 && kgDominante / totalKg > 0.7 && Object.keys(distribucion).length < 3) {
    const nombreMat = MATERIALES_DISPLAY[normalize(matDominante)] ?? matDominante;
    const otrosMat = MATERIALES_COMUNES.filter(m => !materialesActivos.includes(m)).slice(0, 2).map(m => MATERIALES_DISPLAY[m] ?? m);
    tips.push({
      type: 'info',
      icon: <Lightbulb className="w-4 h-4" />,
      title: `Diversificá más allá del ${nombreMat}`,
      body: `El ${Math.round((kgDominante / totalKg) * 100)}% de tu reciclaje es ${nombreMat}. Incorporar ${otrosMat.join(' y ')} puede aumentar significativamente tu CO₂ evitado y el valor ambiental total.`,
    });
  }

  // 5 — Materiales comunes no reciclados
  const faltantes = MATERIALES_COMUNES.filter(m => !materialesActivos.includes(m));
  if (faltantes.length >= 3 && tips.length < 3) {
    const ejemplos = faltantes.slice(0, 3).map(m => MATERIALES_DISPLAY[m] ?? m).join(', ');
    tips.push({
      type: 'info',
      icon: <Leaf className="w-4 h-4" />,
      title: 'Materiales que podés sumar',
      body: `No registrás reciclaje de ${ejemplos}. Separar estos materiales desde el origen puede multiplicar tu impacto ambiental sin cambiar el proceso de recolección.`,
    });
  }

  // 6 — Hito de impacto (CO₂)
  if (metricas.co2_kg >= 500 && tips.filter(t => t.type === 'success').length === 0) {
    tips.push({
      type: 'success',
      icon: <Star className="w-4 h-4" />,
      title: `Lograste evitar ${metricas.co2_kg.toLocaleString()} kg de CO₂`,
      body: `Eso equivale a plantar aproximadamente ${Math.round(metricas.co2_kg / 21)} árboles. Tu empresa está generando un impacto ambiental real y medible.`,
    });
  } else if (metricas.total_kg >= 100 && tips.filter(t => t.type === 'success').length === 0) {
    tips.push({
      type: 'success',
      icon: <Star className="w-4 h-4" />,
      title: `Superaste los ${metricas.total_kg >= 1000 ? `${(metricas.total_kg / 1000).toFixed(1)}t` : `${metricas.total_kg} kg`} reciclados`,
      body: `Gracias a tu participación, evitaste ${metricas.co2_kg} kg de CO₂ y ahorraste ${metricas.agua_litros.toLocaleString()} litros de agua.`,
    });
  }

  return tips.slice(0, 3);
}

const TYPE_STYLES: Record<TipType, { bar: string; bg: string; icon: string; badge: string; badgeText: string }> = {
  success: {
    bar:       'bg-[#4BAF47]',
    bg:        'bg-green-light',
    icon:      'text-[#4BAF47]',
    badge:     'bg-[#4BAF47]/15',
    badgeText: 'text-[#4BAF47]',
  },
  info: {
    bar:       'bg-accent-blue',
    bg:        'bg-bg-page',
    icon:      'text-accent-blue',
    badge:     'bg-accent-blue/10',
    badgeText: 'text-accent-blue',
  },
  warning: {
    bar:       'bg-warning-amber',
    bg:        'bg-warning-light',
    icon:      'text-warning-amber',
    badge:     'bg-warning-amber/15',
    badgeText: 'text-warning-amber dark:text-[#FFB74D]',
  },
  action: {
    bar:       'bg-body-text',
    bg:        'bg-bg-page',
    icon:      'text-body-text',
    badge:     'bg-border-default',
    badgeText: 'text-body-text',
  },
};

const TYPE_LABEL: Record<TipType, string> = {
  success: 'Logro',
  info:    'Oportunidad',
  warning: 'Atención',
  action:  'Acción',
};

interface Props {
  data: DashData | null;
  loading: boolean;
}

export function TipsPersonalizados({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  if (!data) return null;

  const tips = generarTips(data);
  if (tips.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {tips.map((tip, i) => {
        const s = TYPE_STYLES[tip.type];
        return (
          <div key={i} className={`relative rounded-[10px] border border-border-default overflow-hidden ${s.bg}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${s.bar}`} />
            <div className="p-4 pl-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-6 h-6 rounded-[6px] grid place-items-center flex-shrink-0 ${s.badge} ${s.icon}`}>
                  {tip.icon}
                </span>
                <span className={`text-[10px] font-extrabold uppercase tracking-widest ${s.badgeText}`}>
                  {TYPE_LABEL[tip.type]}
                </span>
              </div>
              <p className="font-extrabold text-[13px] text-black-heading leading-snug mb-1">{tip.title}</p>
              <p className="text-[12px] text-body-text leading-relaxed">{tip.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
