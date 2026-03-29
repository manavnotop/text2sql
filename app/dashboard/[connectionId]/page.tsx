'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { Sidebar } from '@/components/layout/sidebar';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { Button } from '@/components/ui/button';
import { Link01Icon } from '@hugeicons/core-free-icons';
import { HugeIcon } from '@/components/ui/icon';

export default function DashboardPage({ params }: { params: Promise<{ connectionId: string }> }) {
  const { connection, dashboardWidgets, removeDashboardWidget, setDashboardWidgets } = useApp();
  const [shareId, setShareId] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    params.then(({ connectionId: id }) => {
      setConnectionId(id);
    });
  }, [params]);

  useEffect(() => {
    if (!connectionId) return;

    async function fetchDashboard() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/dashboards/connection/${connectionId}`);
        if (response.ok) {
          const data = await response.json();
          setShareId(data.shareId);
          if (data.widgets && data.widgets.length > 0) {
            setDashboardWidgets(data.widgets);
          }
        } else {
          console.error('Failed to fetch dashboard:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboard();
  }, [connectionId, setDashboardWidgets]);

  const handleShare = () => {
    if (isLoading) {
      alert('Please wait, loading dashboard...');
      return;
    }
    if (!shareId) {
      alert('Share ID not available. Please refresh the page and try again.');
      return;
    }
    const url = `${window.location.origin}/shared/${shareId}`;
    navigator.clipboard.writeText(url);
    alert('Dashboard link copied to clipboard!');
  };

  if (!connection) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No connection selected. <Link href="/" className="text-primary">Go back</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              {dashboardWidgets.length} widget{dashboardWidgets.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleShare} disabled={isLoading}>
            <HugeIcon icon={Link01Icon} size={14} className="mr-2" />
            {isLoading ? 'Loading...' : 'Share Dashboard'}
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <DashboardGrid
            widgets={dashboardWidgets}
            onRemoveWidget={removeDashboardWidget}
          />
        </div>
      </main>
    </div>
  );
}