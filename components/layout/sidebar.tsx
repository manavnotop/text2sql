'use client';

import React, { memo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database01Icon, BarChartIcon, Settings04Icon, PanelLeftCloseIcon, PanelLeftIcon, ArrowUpDownIcon } from '@hugeicons/core-free-icons';
import { HugeIcon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/app-context';

interface NavItem {
  href: string;
  label: string;
  icon: IconSvgElement;
}

type IconSvgElement = readonly (readonly [string, { readonly [key: string]: string | number }])[];

const navItems: NavItem[] = [
  { href: '/query', label: 'Query', icon: Database01Icon },
  { href: '/dashboard', label: 'Dashboard', icon: BarChartIcon },
  { href: '/settings', label: 'Settings', icon: Settings04Icon },
];

interface SidebarProps {
  className?: string;
}

function SidebarComponent({ className }: SidebarProps) {
  const { connection, schema } = useApp();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [schemaExpanded, setSchemaExpanded] = useState(true);

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-card transition-all duration-200',
        isCollapsed ? 'w-14' : 'w-64',
        className
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-3">
        {!isCollapsed && (
          <span className="text-sm font-semibold text-foreground">BI Platform</span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <HugeIcon icon={isCollapsed ? PanelLeftIcon : PanelLeftCloseIcon} size={16} />
        </button>
      </div>

      {connection && !isCollapsed && (
        <div className="border-b border-border px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Connected</span>
          </div>
          <p className="mt-1 text-sm font-medium truncate">{connection.name || connection.database}</p>
          <p className="text-xs text-muted-foreground truncate">{connection.host}:{connection.port}</p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={connection ? `${item.href}/${connection.id}` : item.href}
                className={cn(
                  'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <HugeIcon icon={item.icon} size={18} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {schema && !isCollapsed && (
          <div className="mt-4">
            <button
              onClick={() => setSchemaExpanded(!schemaExpanded)}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <HugeIcon icon={ArrowUpDownIcon} size={14} className={cn('transition-transform', schemaExpanded ? '' : 'rotate-180')} />
              Schema ({schema.summary.totalTables} tables)
            </button>
            {schemaExpanded && (
              <div className="mt-1 space-y-0.5">
                {schema.tables.map((table) => (
                  <div key={table.name} className="px-3 py-1.5 text-xs">
                    <div className="font-medium text-foreground">{table.name}</div>
                    <div className="ml-2 mt-0.5 space-y-0.5">
                      {table.columns.slice(0, 5).map((col) => (
                        <div key={col.name} className="flex items-center gap-1 text-muted-foreground">
                          <span className="text-[10px] uppercase">{col.type}</span>
                          <span>{col.name}</span>
                        </div>
                      ))}
                      {table.columns.length > 5 && (
                        <div className="text-muted-foreground">+{table.columns.length - 5} more</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}

export const Sidebar = memo(SidebarComponent);