'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: { table: string; column: string } | null;
  sampleValues?: string[];
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  sampleValues?: Record<string, string[]>[];
}

interface SchemaAnalysis {
  tables: TableInfo[];
  relationships?: Array<{
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
  }>;
  summary: {
    totalTables: number;
    totalColumns: number;
    totalRelationships: number;
  };
}

interface ConnectionConfig {
  id: string;
  host: string;
  port: number;
  database: string;
  user: string;
  name?: string;
  createdAt: string;
  type: 'demo' | 'custom';
}

interface QueryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  data?: Record<string, unknown>[];
  chartType?: 'bar' | 'line' | 'pie' | 'scatter';
  explanation?: string;
  timestamp: Date;
}

interface DashboardWidget {
  id: string;
  title: string;
  data: Record<string, unknown>[];
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
  position: { x: number; y: number; w: number; h: number };
  query: string;
}

interface AppContextType {
  connection: ConnectionConfig | null;
  schema: SchemaAnalysis | null;
  queryHistory: QueryMessage[];
  dashboardWidgets: DashboardWidget[];
  setConnection: (conn: ConnectionConfig | null) => void;
  setSchema: (schema: SchemaAnalysis | null) => void;
  setDashboardWidgets: (widgets: DashboardWidget[]) => void;
  addQueryMessage: (msg: Omit<QueryMessage, 'id' | 'timestamp'>) => void;
  clearQueryHistory: () => void;
  addDashboardWidget: (widget: Omit<DashboardWidget, 'id'>) => Promise<void>;
  removeDashboardWidget: (id: string) => Promise<void>;
  updateDashboardWidget: (id: string, updates: Partial<DashboardWidget>) => Promise<void>;
  loadDashboardWidgets: (connectionId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [connection, setConnectionState] = useState<ConnectionConfig | null>(null);
  const [schema, setSchemaState] = useState<SchemaAnalysis | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryMessage[]>([]);
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>([]);

  const setConnection = useCallback((conn: ConnectionConfig | null) => {
    setConnectionState(conn);
  }, []);

  const setSchema = useCallback((s: SchemaAnalysis | null) => {
    setSchemaState(s);
  }, []);

  const addQueryMessage = useCallback((msg: Omit<QueryMessage, 'id' | 'timestamp'>) => {
    const newMsg: QueryMessage = {
      ...msg,
      id: generateId(),
      timestamp: new Date(),
    };
    setQueryHistory(prev => [...prev, newMsg]);
  }, []);

  const clearQueryHistory = useCallback(() => {
    setQueryHistory([]);
  }, []);

  const addDashboardWidget = useCallback(async (widget: Omit<DashboardWidget, 'id'>) => {
    const newWidget: DashboardWidget = {
      ...widget,
      id: generateId(),
    };
    setDashboardWidgets(prev => {
      const updated = [...prev, newWidget];
      
      const connectionId = window.location.pathname.split('/').pop();
      if (connectionId) {
        fetch(`/api/dashboards/${connectionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ widgets: updated }),
        }).catch(error => console.error('Error saving widget:', error));
      }
      
      return updated;
    });
  }, []);

  const removeDashboardWidget = useCallback(async (id: string) => {
    setDashboardWidgets(prev => {
      const updated = prev.filter(w => w.id !== id);
      
      const connectionId = window.location.pathname.split('/').pop();
      if (connectionId) {
        fetch(`/api/dashboards/${connectionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ widgets: updated }),
        }).catch(error => console.error('Error removing widget:', error));
      }
      
      return updated;
    });
  }, []);

  const updateDashboardWidget = useCallback(async (id: string, updates: Partial<DashboardWidget>) => {
    setDashboardWidgets(prev =>
      prev.map(w => (w.id === id ? { ...w, ...updates } : w))
    );

    const connectionId = window.location.pathname.split('/').pop();
    if (connectionId) {
      try {
        const response = await fetch(`/api/dashboards/${connectionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ widgets: dashboardWidgets }),
        });
        if (!response.ok) {
          console.error('Failed to update dashboard on server');
        }
      } catch (error) {
        console.error('Error updating dashboard:', error);
      }
    }
  }, [dashboardWidgets]);

  const loadDashboardWidgets = useCallback(async (connectionId: string) => {
    try {
      const response = await fetch(`/api/dashboards/${connectionId}`);
      if (response.ok) {
        const data = await response.json();
        setDashboardWidgets(data.widgets || []);
      }
    } catch (error) {
      console.error('Error loading dashboard widgets:', error);
    }
  }, []);

  const setDashboardWidgetsState = useCallback((widgets: DashboardWidget[]) => {
    setDashboardWidgets(widgets);
  }, []);

  const value = useMemo(() => ({
    connection,
    schema,
    queryHistory,
    dashboardWidgets,
    setConnection,
    setSchema,
    setDashboardWidgets: setDashboardWidgetsState,
    addQueryMessage,
    clearQueryHistory,
    addDashboardWidget,
    removeDashboardWidget,
    updateDashboardWidget,
    loadDashboardWidgets,
  }), [
    connection,
    schema,
    queryHistory,
    dashboardWidgets,
    setConnection,
    setSchema,
    setDashboardWidgetsState,
    addQueryMessage,
    clearQueryHistory,
    addDashboardWidget,
    removeDashboardWidget,
    updateDashboardWidget,
    loadDashboardWidgets,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}