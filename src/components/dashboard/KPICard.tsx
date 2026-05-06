import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: number;
  className?: string;
  onClick?: () => void;
}

export function KPICard({ title, value, icon: Icon, subtitle, trend, className, onClick }: KPICardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-card p-5 shadow-sm transition-all',
        onClick ? 'cursor-pointer hover:shadow-md hover:bg-muted/30 active:scale-[0.98]' : 'hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend !== undefined && (
            <p className={cn('text-xs font-medium', trend >= 0 ? 'text-emerald-500' : 'text-red-500')}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs mês anterior
            </p>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
