'use client';

import React, { memo, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Table01Icon, Chart01Icon } from '@hugeicons/core-free-icons';
import { HugeIcon } from '@/components/ui/icon';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ChartContainer = dynamic(
  () => import('@/components/charts/chart-container').then(m => ({ default: m.ChartContainer })),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart...</div> }
);

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'table';

interface QueryResultsProps {
  data: Record<string, unknown>[];
  chartRecommendation?: {
    type: ChartType;
    insight: string;
  };
  onChartTypeChange?: (type: ChartType) => void;
  className?: string;
}

const PAGE_SIZE = 50;

function QueryResultsComponent({
  data,
  chartRecommendation,
  onChartTypeChange,
  className
}: QueryResultsProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'scatter'>(
    (chartRecommendation?.type === 'table' ? 'bar' : chartRecommendation?.type) || 'bar'
  );
  const [viewMode, setViewMode] = useState<'table' | 'chart'>(
    chartRecommendation?.type && chartRecommendation.type !== 'table' ? 'chart' : 'table'
  );

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return sortedData.slice(start, start + PAGE_SIZE);
  }, [sortedData, currentPage]);

  const totalPages = useMemo(() => Math.ceil(data.length / PAGE_SIZE), [data.length]);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  const handleChartTypeChange = useCallback((type: ChartType) => {
    if (type === 'table') {
      setViewMode('table');
    } else {
      setViewMode('chart');
      setChartType(type as 'bar' | 'line' | 'pie' | 'scatter');
    }
    onChartTypeChange?.(type);
  }, [onChartTypeChange]);

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-muted-foreground text-base font-medium', className)}>
        No results to display
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-foreground">
          {data.length} rows
          {sortColumn && ` — sorted by ${sortColumn} (${sortDirection})`}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleChartTypeChange('table')}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
              viewMode === 'table' ? '' : ''
            )}
          >
            <HugeIcon icon={Table01Icon} size={14} />
            Table
          </Button>
          <Button
            variant={viewMode === 'chart' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleChartTypeChange(chartType)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
              viewMode === 'chart' ? '' : ''
            )}
          >
            <HugeIcon icon={Chart01Icon} size={14} />
            Chart
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {viewMode === 'table' ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    onClick={() => handleSort(column)}
                    className="px-4 py-3 text-left font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      {column}
                      {sortColumn === column && (
                        <span className="text-foreground font-bold">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    'border-b border-border/50 font-medium',
                    idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                  )}
                >
                  {columns.map((column) => (
                    <td key={column} className="px-4 py-3 truncate max-w-[200px]">
                      {row[column] === null ? (
                        <span className="text-muted-foreground italic">null</span>
                      ) : (
                        String(row[column])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              {(['bar', 'line', 'pie', 'scatter'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={cn(
                    'px-3 py-1 text-xs rounded border transition-colors capitalize',
                    chartType === type ? 'bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0">
              <ChartContainer data={data} chartType={chartType} className="h-full" />
            </div>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <span className="text-xs text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export const QueryResults = memo(QueryResultsComponent);