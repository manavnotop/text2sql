'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Database01Icon, Logout01Icon } from '@hugeicons/core-free-icons';
import { HugeIcon } from '@/components/ui/icon';

export default function SettingsPage() {
  const { connection, setConnection, setSchema, clearQueryHistory } = useApp();

  const handleDisconnect = () => {
    setConnection(null);
    setSchema(null);
    clearQueryHistory();
    window.location.href = '/';
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
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl space-y-6">
            <section className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-sm font-semibold mb-4">Connection Info</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <HugeIcon icon={Database01Icon} size={20} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{connection.name || connection.database}</p>
                    <p className="text-xs text-muted-foreground">{connection.host}:{connection.port}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium capitalize">{connection.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">User</p>
                    <p className="font-medium">{connection.user}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-sm font-semibold mb-4">Actions</h2>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={handleDisconnect}>
                  <HugeIcon icon={Logout01Icon} size={16} className="mr-2" />
                  Disconnect Database
                </Button>
              </div>
            </section>

            <section className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-sm font-semibold mb-4">About</h2>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Conversational BI Platform v1.0.0</p>
                <p>Transform natural language queries into SQL and visualizations.</p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}