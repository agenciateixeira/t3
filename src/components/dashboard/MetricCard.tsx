import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantStyles = {
  default: {
    card: 'bg-white border-gray-200',
    icon: 'bg-gray-100 text-gray-600',
    value: 'text-gray-900',
  },
  primary: {
    card: 'bg-gradient-to-br from-[#2db4af]/8 to-[#2db4af]/4 border-[#2db4af]/20',
    icon: 'bg-[#2db4af]/15 text-[#2db4af]',
    value: 'text-[#2db4af]',
  },
  success: {
    card: 'bg-gradient-to-br from-green-500/8 to-green-500/4 border-green-500/20',
    icon: 'bg-green-500/15 text-green-600',
    value: 'text-green-600',
  },
  warning: {
    card: 'bg-gradient-to-br from-yellow-500/8 to-yellow-500/4 border-yellow-500/20',
    icon: 'bg-yellow-500/15 text-yellow-600',
    value: 'text-yellow-900',
  },
  danger: {
    card: 'bg-gradient-to-br from-red-500/8 to-red-500/4 border-red-500/20',
    icon: 'bg-red-500/15 text-red-600',
    value: 'text-red-600',
  },
};

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = 'default',
  className,
}: MetricCardProps) {
  const styles = variantStyles[variant];

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="h-3 w-3" />;
    if (trend.value < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-green-600';
    if (trend.value < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        styles.card,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
            {title}
          </p>
          <p className={cn('text-2xl font-semibold tabular-nums', styles.value)}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', getTrendColor())}>
              {getTrendIcon()}
              <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
              {trend.label && (
                <span className="text-gray-500 font-normal">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('p-2.5 rounded-lg shrink-0', styles.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
