'use client';

import React, { memo, useState, useDeferredValue, useMemo } from 'react';
import { Database01Icon } from '@hugeicons/core-free-icons';
import { HugeIcon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/app-context';

interface SchemaBrowserProps {
  className?: string;
  onTableClick?: (tableName: string) => void;
  onColumnClick?: (tableName: string, columnName: string) => void;
}

function SchemaBrowserComponent({ className, onTableClick, onColumnClick }: SchemaBrowserProps) {
  const { schema } = useApp();
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);

  const filteredTables = useMemo(() => {
    if (!schema) return [];
    if (!deferredSearch.trim()) return schema.tables;

    const query = deferredSearch.toLowerCase();
    return schema.tables.filter(table => 
      table.name.toLowerCase().includes(query) ||
      table.columns.some(col => col.name.toLowerCase().includes(query))
    );
  }, [schema, deferredSearch]);

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  if (!schema) {
    return (
      <div className={cn('flex items-center justify-center p-8 text-muted-foreground text-sm', className)}>
        No schema loaded
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="p-3 border-b border-border">
        <Input
          type="text"
          placeholder="Search tables or columns..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
        {filteredTables.map((table) => (
          <div key={table.name} className="mb-1">
            <button
              onClick={() => {
                toggleTable(table.name);
                onTableClick?.(table.name);
              }}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted rounded transition-colors"
            >
              <HugeIcon
                icon={Database01Icon}
                size={14}
                className={cn('transition-transform', expandedTables.has(table.name) ? '' : 'opacity-50')}
              />
              <span className="font-medium text-foreground">{table.name}</span>
              <span className="ml-auto text-muted-foreground">({table.columns.length})</span>
            </button>

            {expandedTables.has(table.name) && (
              <div className="ml-6 mt-0.5 space-y-0.5">
                {table.columns.map((column) => (
                  <button
                    key={column.name}
                    onClick={() => onColumnClick?.(table.name, column.name)}
                    className="flex w-full items-center gap-2 px-2 py-1 text-xs hover:bg-muted rounded transition-colors text-left"
                  >
                    <span className={cn(
                      'text-[10px] px-1 py-0.5 rounded uppercase',
                      column.isPrimaryKey ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      column.isForeignKey ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {column.type}
                    </span>
                    <span className="text-foreground truncate">{column.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

          {filteredTables.length === 0 && (
            <div className="text-center p-4 text-xs text-muted-foreground">
              No tables or columns match &quot;{deferredSearch}&quot;
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export const SchemaBrowser = memo(SchemaBrowserComponent);