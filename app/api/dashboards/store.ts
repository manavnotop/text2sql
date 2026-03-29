export interface Widget {
  id: string;
  title: string;
  query: string;
  sql: string;
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
  position: { x: number; y: number; w: number; h: number };
  data?: unknown[];
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
  shareId: string;
}

export const dashboards = new Map<string, Dashboard>();