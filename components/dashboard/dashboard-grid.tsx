'use client';

import React, { memo, useState, useCallback } from 'react';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { HugeIcon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/visualization/data-table';
import { ChartContainer } from '@/components/charts/chart-container';
import { cn } from '@/lib/utils';

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'table';

interface DashboardWidget {
  id: string;
  title: string;
  data: Record<string, unknown>[];
  chartType: ChartType;
  position: { x: number; y: number; w: number; h: number };
  query: string;
}

interface DashboardGridProps {
  widgets: DashboardWidget[];
  onAddWidget?: (widget: Omit<DashboardWidget, 'id'>) => void;
  onRemoveWidget?: (id: string) => void;
  className?: string;
}

function DashboardGridComponent({ widgets, onAddWidget, onRemoveWidget, className }: DashboardGridProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== targetId) {
      // Handle reorder - for now just clear state
      console.log('Reorder:', draggedId, 'to', targetId);
    }
    setDraggedId(null);
  }, [draggedId]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);

  return (
    <div className={cn('relative', className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
        {widgets.map((widget) => (
          <Card
            key={widget.id}
            draggable
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              'overflow-hidden transition-all',
              'hover:shadow-md cursor-move',
              draggedId === widget.id && 'opacity-50'
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="text-base font-semibold truncate">{widget.title}</h3>
              {onRemoveWidget && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onRemoveWidget(widget.id)}
                  className="h-6 w-6 opacity-50 hover:opacity-100"
                >
                  ×
                </Button>
              )}
            </div>

            <CardContent className="p-0">
              <div className="h-64">
                {widget.chartType === 'table' ? (
                  <DataTable data={widget.data} />
                ) : (
                  <ChartContainer
                    data={widget.data}
                    chartType={widget.chartType as 'bar' | 'line' | 'pie' | 'scatter'}
                  />
                )}
              </div>

              <div className="px-4 py-2 border-t border-border bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground truncate">
                  {widget.query}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {onAddWidget && (
          <button
            onClick={() => {
              // This would open a modal to configure a new widget
            }}
            className={cn(
              'flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-border rounded-lg',
              'text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors'
            )}
          >
            <HugeIcon icon={Add01Icon} size={24} className="mb-2" />
            <span className="text-sm">Add Widget</span>
          </button>
        )}
      </div>

      {widgets.length === 0 && !onAddWidget && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p className="text-base font-medium">No widgets added yet</p>
          <p className="text-sm mt-1">Run queries and save them to your dashboard</p>
        </div>
      )}
    </div>
  );
}

export const DashboardGrid = memo(DashboardGridComponent);