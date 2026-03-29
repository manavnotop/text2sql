'use client';

import React, { memo, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';
import { cn } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type ChartType = 'bar' | 'line' | 'pie' | 'scatter';

interface ChartContainerProps {
  data: Record<string, unknown>[];
  chartType: ChartType;
  title?: string;
  className?: string;
}

function getChartColors(count: number): string[] {
  const colors = [
    'rgba(59, 130, 246, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(236, 72, 153, 0.8)',
    'rgba(14, 165, 233, 0.8)',
    'rgba(34, 197, 94, 0.8)',
  ];
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}

function ChartContainerComponent({ data, chartType, title, className }: ChartContainerProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const keys = Object.keys(data[0]);
    const labelKey = keys[0];
    const valueKeys = keys.slice(1);
    const labels = data.map(row => String(row[labelKey]));
    const colors = getChartColors(valueKeys.length);

    if (chartType === 'pie') {
      return {
        labels,
        datasets: [{
          data: data.map(row => Number(row[valueKeys[0]]) || 0),
          backgroundColor: colors,
          borderColor: colors.map(c => c.replace('0.8', '1')),
          borderWidth: 1,
        }],
      };
    }

    return {
      labels,
      datasets: valueKeys.map((key, idx) => ({
        label: key,
        data: data.map(row => Number(row[key]) || 0),
        backgroundColor: chartType === 'line' ? 'transparent' : colors[idx],
        borderColor: colors[idx],
        borderWidth: chartType === 'line' ? 2 : 1,
        tension: 0.3,
      })),
    };
  }, [data, chartType]);

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-muted-foreground text-sm', className)}>
        No data to visualize
      </div>
    );
  }

  if (!chartData) return null;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 14,
          padding: 16,
          font: { size: 13, weight: 'bold' as const },
          color: '#475569',
        },
      },
      title: {
        display: !!title,
        text: title,
        font: { size: 16, weight: 'bold' as const },
        color: '#1e293b',
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        padding: 14,
        cornerRadius: 8,
        titleFont: { size: 13, weight: 'bold' as const },
        bodyFont: { size: 12 },
      },
    },
    scales: chartType === 'pie' ? undefined : {
      x: { grid: { display: false }, ticks: { font: { size: 12, weight: '500' as const }, color: '#64748b' } },
      y: { grid: { color: 'rgba(148, 163, 184, 0.15)' }, ticks: { font: { size: 12, weight: '500' as const }, color: '#64748b' } },
    },
  };

  return (
    <div className={cn('w-full h-full p-4', className)}>
      {chartType === 'bar' && <Bar data={chartData as never} options={options as never} />}
      {chartType === 'line' && <Line data={chartData as never} options={options as never} />}
      {chartType === 'scatter' && <Scatter data={chartData as never} options={options as never} />}
      {chartType === 'pie' && <Pie data={chartData as never} options={options as never} />}
    </div>
  );
}

export const ChartContainer = memo(ChartContainerComponent);