'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/visualization/data-table';
import { ChartContainer } from '@/components/charts/chart-container';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'table';

interface Widget {
  id: string;
  title: string;
  query: string;
  sql: string;
  chartType: ChartType;
  position: { x: number; y: number; w: number; h: number };
  data?: Record<string, unknown>[];
}

interface SharedDashboard {
  id: string;
  name: string;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
  shareId: string;
}

export default function SharedDashboardPage({ params }: { params: Promise<{ shareId: string }> }) {
  const [dashboard, setDashboard] = useState<SharedDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ shareId: id }) => {
      setShareId(id);
    });
  }, [params]);

  useEffect(() => {
    if (!shareId) return;

    async function fetchDashboard() {
      try {
        const response = await fetch(`/api/dashboards/share/${shareId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Dashboard not found or has been removed');
          } else {
            setError('Failed to load dashboard');
          }
          return;
        }
        const data = await response.json();
        setDashboard(data);
      } catch {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">!</span>
          </div>
          <h1 className="text-xl font-semibold mb-2">{error}</h1>
          <p className="text-muted-foreground mb-6">The dashboard you're looking for doesn't exist or has been removed.</p>
          <Link href="/" className="text-primary hover:underline">
            Go to home page
          </Link>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{dashboard.name}</h1>
              <p className="text-sm text-muted-foreground">
                {dashboard.widgets.length} widget{dashboard.widgets.length !== 1 ? 's' : ''} · Shared Dashboard
              </p>
            </div>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Create your own dashboard →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {dashboard.widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-base font-medium">No widgets in this dashboard</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboard.widgets.map((widget) => (
              <Card key={widget.id} className="overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <h3 className="text-base font-semibold truncate">{widget.title}</h3>
                </div>
                <CardContent className="p-0">
                  <div className="h-64">
                    {widget.chartType === 'table' ? (
                      <DataTable data={widget.data || []} />
                    ) : (
                      <ChartContainer
                        data={widget.data || []}
                        chartType={widget.chartType as 'bar' | 'line' | 'pie' | 'scatter'}
                      />
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-border bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground truncate">
                      {widget.query || widget.sql}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}