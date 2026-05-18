import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: number; label?: string };
  color?: string;
}

export function StatCard({ label, value, icon, trend, color }: StatCardProps) {
  return (
    <div className="dashboard-stat-card">
      <div className="dashboard-stat-icon" style={color ? { color } : undefined}>
        {icon}
      </div>
      <div className="dashboard-stat-body">
        <span className="dashboard-stat-label">{label}</span>
        <span className="dashboard-stat-value">{value}</span>
        {trend && (
          <span className={`dashboard-stat-trend ${trend.value >= 0 ? 'up' : 'down'}`}>
            {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.value >= 0 ? '+' : ''}{trend.value}%
            {trend.label && <span className="dashboard-stat-trend-label">{trend.label}</span>}
          </span>
        )}
      </div>
    </div>
  );
}
