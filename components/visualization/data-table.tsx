'use client';

import React, { memo, useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface DataTableProps {
  data: Record<string, unknown>[];
  className?: string;
}

function DataTableComponent({ data, className }: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-muted-foreground text-sm', className)}>
        No data to display
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-auto', className)}>
      <table className="w-full text-xs">
        <thead className="bg-muted/80 sticky top-0">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                onClick={() => handleSort(column)}
                className="px-4 py-3 text-left font-semibold text-muted-foreground cursor-pointer hover:bg-muted transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
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
          {sortedData.map((row, idx) => (
            <tr
              key={idx}
              className={cn(
                'border-b border-border/50 transition-colors hover:bg-muted/30',
                idx % 2 === 0 ? 'bg-background' : 'bg-muted/10'
              )}
            >
              {columns.map((column) => (
                <td key={column} className="px-4 py-2.5 truncate max-w-[200px]">
                  {row[column] === null ? (
                    <span className="text-muted-foreground italic">null</span>
                  ) : typeof row[column] === 'number' ? (
                    <span className="font-mono">{String(row[column])}</span>
                  ) : (
                    String(row[column])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const DataTable = memo(DataTableComponent);