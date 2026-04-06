import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import type { SaleItem, HistoryData } from '@/types/sales';
import { MONTH_NAMES } from '@/types/sales';

const COLORS = [
  'hsl(217, 91%, 50%)', 'hsl(162, 63%, 41%)', 'hsl(262, 83%, 58%)',
  'hsl(25, 95%, 53%)', 'hsl(340, 75%, 55%)', 'hsl(190, 80%, 45%)',
  'hsl(45, 90%, 50%)', 'hsl(300, 60%, 50%)', 'hsl(120, 50%, 45%)',
  'hsl(0, 70%, 55%)',
];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export function TopSoldChart({ items }: { items: SaleItem[] }) {
  const data = useMemo(() => items.slice(0, 10).map(i => ({ name: i.code, total: i.totalUN })), [items]);
  return (
    <ChartCard title="Top 10 Mais Vendidos">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <XAxis type="number" tickFormatter={v => v.toLocaleString('pt-BR')} fontSize={11} />
          <YAxis type="category" dataKey="name" fontSize={10} width={75} />
          <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR') + ' UN'} />
          <Bar dataKey="total" fill="hsl(217, 91%, 50%)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function FamilyChart({ items }: { items: SaleItem[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(i => map.set(i.family, (map.get(i.family) || 0) + i.totalUN));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [items]);
  return (
    <ChartCard title="Vendas por Família">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="name" fontSize={11} />
          <YAxis tickFormatter={v => v.toLocaleString('pt-BR')} fontSize={11} />
          <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR') + ' UN'} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function MonthlyComparisonChart({ history, year }: { history: HistoryData; year: string }) {
  const data = useMemo(() => {
    return MONTH_NAMES.map((name, i) => ({
      name: name.slice(0, 3),
      total: history[year]?.[String(i + 1)]?.totalUN || 0,
    }));
  }, [history, year]);
  return (
    <ChartCard title={`Comparativo Mensal — ${year}`}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
          <XAxis dataKey="name" fontSize={11} />
          <YAxis tickFormatter={v => v.toLocaleString('pt-BR')} fontSize={11} />
          <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR') + ' UN'} />
          <Bar dataKey="total" fill="hsl(162, 63%, 41%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function YearComparisonChart({ history, year }: { history: HistoryData; year: string }) {
  const prevYear = String(Number(year) - 1);
  const data = useMemo(() => {
    return MONTH_NAMES.map((name, i) => ({
      name: name.slice(0, 3),
      [year]: history[year]?.[String(i + 1)]?.totalUN || 0,
      [prevYear]: history[prevYear]?.[String(i + 1)]?.totalUN || 0,
    }));
  }, [history, year, prevYear]);
  return (
    <ChartCard title={`${prevYear} vs ${year}`}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
          <XAxis dataKey="name" fontSize={11} />
          <YAxis tickFormatter={v => v.toLocaleString('pt-BR')} fontSize={11} />
          <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR') + ' UN'} />
          <Legend />
          <Line type="monotone" dataKey={year} stroke="hsl(217, 91%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey={prevYear} stroke="hsl(220, 10%, 60%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ItemEvolutionChart({ history, year, codes }: { history: HistoryData; year: string; codes: string[] }) {
  const topCodes = codes.slice(0, 5);
  const data = useMemo(() => {
    return MONTH_NAMES.map((name, mi) => {
      const monthData = history[year]?.[String(mi + 1)];
      const point: Record<string, any> = { name: name.slice(0, 3) };
      topCodes.forEach(code => {
        const item = monthData?.items?.find(it => it.code === code);
        point[code] = item?.totalUN || 0;
      });
      return point;
    });
  }, [history, year, topCodes]);
  return (
    <ChartCard title="Evolução por Item (Top 5)">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
          <XAxis dataKey="name" fontSize={11} />
          <YAxis tickFormatter={v => v.toLocaleString('pt-BR')} fontSize={11} />
          <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR') + ' UN'} />
          <Legend />
          {topCodes.map((code, i) => (
            <Line key={code} type="monotone" dataKey={code} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 2 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ShareChart({ items }: { items: SaleItem[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(i => map.set(i.family, (map.get(i.family) || 0) + i.totalUN));
    const total = items.reduce((s, i) => s + i.totalUN, 0);
    return Array.from(map, ([name, value]) => ({
      name,
      value,
      pct: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
    })).sort((a, b) => b.value - a.value);
  }, [items]);
  return (
    <ChartCard title="Participação Percentual por Família">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2} label={({ name, pct }) => `${name} ${pct}%`} fontSize={11}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR') + ' UN'} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
