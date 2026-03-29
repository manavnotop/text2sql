'use client';

import React, { memo, useState, useCallback, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ConnectionFormProps {
  onConnect: (config: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    name?: string;
  }) => Promise<{ success: boolean; error?: string; connectionId?: string; schema?: unknown }>;
  onCancel?: () => void;
  className?: string;
}

function ConnectionFormComponent({ onConnect, onCancel, className }: ConnectionFormProps) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsConnecting(true);

    try {
      const result = await onConnect({
        host,
        port: parseInt(port, 10),
        database,
        user,
        password,
        name: name || undefined,
      });

      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch {
      setError('Connection failed. Please check your settings.');
    } finally {
      setIsConnecting(false);
    }
  }, [host, port, database, user, password, name, onConnect]);

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-4', className)}>
      <div className="space-y-1.5">
        <Label htmlFor="name">
          Connection Name (optional)
        </Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Database"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="host">
          Host *
        </Label>
        <Input
          id="host"
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="localhost"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="port">
            Port *
          </Label>
          <Input
            id="port"
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="5432"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="database">
            Database *
          </Label>
          <Input
            id="database"
            type="text"
            value={database}
            onChange={(e) => setDatabase(e.target.value)}
            placeholder="postgres"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="user">
          Username *
        </Label>
        <Input
          id="user"
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="postgres"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">
          Password *
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>

      {error && (
        <div className="px-3 py-2 text-xs bg-destructive/10 text-destructive rounded">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isConnecting || isPending}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </Button>
      </div>
    </form>
  );
}

export const ConnectionForm = memo(ConnectionFormComponent);