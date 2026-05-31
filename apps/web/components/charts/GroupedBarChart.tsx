'use client';

import {
  BarChart as ReBarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface Props {
  data: { mes: string; aprobado: number; rechazado: number }[];
}

export function GroupedBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ReBarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--bd, #E2DFD1)" />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--bt, #54584C)' }} tickFormatter={v => v.slice(5)} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--bt, #54584C)' }} allowDecimals={false} width={28} />
        <Tooltip
          contentStyle={{ background: 'var(--card, #fff)', border: '1px solid var(--bd, #E2DFD1)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--bk, #1A1D17)', fontWeight: 700, marginBottom: 4 }}
          labelFormatter={v => String(v).slice(5) + ' / ' + String(v).slice(0, 4)}
        />
        <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: 'var(--bt, #54584C)' }} />
        <Bar dataKey="aprobado" name="Aprobadas"  fill="#4BAF47" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="rechazado" name="Rechazadas" fill="#B23B2E" radius={[3, 3, 0, 0]} maxBarSize={32} />
      </ReBarChart>
    </ResponsiveContainer>
  );
}
