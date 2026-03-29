'use client';

import React, { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DemoConnectProps {
  onConnect: () => Promise<{ success: boolean; error?: string; connectionId?: string; schema?: unknown }>;
  className?: string;
}

function DemoConnectComponent({ onConnect, className }: DemoConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    try {
      const result = await onConnect();
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch {
      setError('Failed to connect to demo database.');
    } finally {
      setIsConnecting(false);
    }
  }, [onConnect]);

  return (
    <Card className={cn('', className)}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
            <span className="text-lg font-bold text-primary">DB</span>
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">Demo Database</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Pre-configured sample database with sales data, customers, and products to explore the platform.
            </p>

            <div className="space-y-0.5 text-xs text-muted-foreground mb-4">
              <div className="flex justify-between">
                <span>Tables:</span>
                <span className="font-medium text-foreground">8</span>
              </div>
              <div className="flex justify-between">
                <span>Sample Rows:</span>
                <span className="font-medium text-foreground">1000+</span>
              </div>
            </div>

            {error && (
              <div className="mb-3 px-3 py-2 text-xs bg-destructive/10 text-destructive rounded">
                {error}
              </div>
            )}

            <Button onClick={handleConnect} disabled={isConnecting} size="sm">
              {isConnecting ? 'Connecting...' : 'Connect to Demo'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const DemoConnect = memo(DemoConnectComponent);