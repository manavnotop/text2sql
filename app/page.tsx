'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database01Icon, Settings04Icon, Logout01Icon } from '@hugeicons/core-free-icons';
import { HugeIcon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DemoConnect } from '@/components/connection/demo-connect';
import { ConnectionForm } from '@/components/connection/connection-form';
import { useApp } from '@/context/app-context';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const { setConnection, setSchema } = useApp();
  const { isAuthenticated, logout, user } = useAuth();
  const [showCustomForm, setShowCustomForm] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleDemoConnect = useCallback(async () => {
    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: process.env.NEXT_PUBLIC_DEMO_DB_HOST || 'localhost',
          port: parseInt(process.env.NEXT_PUBLIC_DEMO_DB_PORT || '5432', 10),
          database: process.env.NEXT_PUBLIC_DEMO_DB_NAME || 'demo',
          user: process.env.NEXT_PUBLIC_DEMO_DB_USER || 'postgres',
          password: process.env.NEXT_PUBLIC_DEMO_DB_PASSWORD || 'postgres',
          name: 'Demo Database',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setConnection({
          id: result.connectionId,
          host: 'demo',
          port: 5432,
          database: 'demo',
          user: 'demo',
          name: 'Demo Database',
          createdAt: new Date().toISOString(),
          type: 'demo',
        });

        if (result.schema) {
          setSchema(result.schema as Parameters<typeof setSchema>[0]);
        }

        router.push(`/query/${result.connectionId}`);
        return { success: true, connectionId: result.connectionId, schema: result.schema };
      }

      return { success: false, error: result.error || 'Connection failed' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [router, setConnection, setSchema]);

  const handleCustomConnect = useCallback(async (config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    name?: string;
  }) => {
    try {
      const response = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (result.success) {
        setConnection({
          id: result.connectionId,
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          name: config.name,
          createdAt: new Date().toISOString(),
          type: 'custom',
        });

        if (result.schema) {
          setSchema(result.schema as Parameters<typeof setSchema>[0]);
        }

        router.push(`/query/${result.connectionId}`);
        return { success: true, connectionId: result.connectionId, schema: result.schema };
      }

      return { success: false, error: result.error || 'Connection failed' };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, [router, setConnection, setSchema]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <HugeIcon icon={Database01Icon} size={18} className="text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">Conversational BI</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-xs text-muted-foreground">{user.username}</span>
            )}
            <Button variant="ghost" size="sm" onClick={logout}>
              <HugeIcon icon={Logout01Icon} size={16} className="mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold mb-3">Ask Questions, Get Insights</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Connect to your database and ask questions in natural language.
            We&apos;ll generate SQL and create visualizations automatically.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <DemoConnect onConnect={handleDemoConnect} />

          <Card className={cn(
            '',
            showCustomForm ? '' : 'bg-muted/30'
          )}>
            <CardContent className="pt-6">
              {showCustomForm ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">Custom Database</h3>
                    <button
                      onClick={() => setShowCustomForm(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                  <ConnectionForm onConnect={handleCustomConnect} />
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
                    <HugeIcon icon={Settings04Icon} size={24} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold mb-1">Custom Database</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Connect to your own PostgreSQL database
                  </p>
                  <Button variant="outline" onClick={() => setShowCustomForm(true)} size="sm">
                    Configure Connection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}