'use client';

import React, { memo, useState, useTransition, useCallback } from 'react';
import { ArrowUpIcon, Copy01Icon, CheckmarkCircleIcon } from '@hugeicons/core-free-icons';
import { HugeIcon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  explanation?: string;
  chartRecommendation?: {
    type: 'bar' | 'line' | 'pie' | 'scatter';
    insight: string;
  };
  timestamp: Date;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  className?: string;
}

function ChatInterfaceComponent({ messages, onSendMessage, isLoading, className }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    startTransition(() => {
      onSendMessage(trimmed);
      setInputValue('');
    });
  }, [inputValue, isLoading, onSendMessage]);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  return (
    <div className={cn('flex flex-col h-full w-full overflow-hidden box-border', className)}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 w-full max-w-full box-border">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-foreground text-base font-medium">
            <p className="mb-2">Ask questions about your data in natural language.</p>
            <p className="text-sm text-muted-foreground">Example: &quot;Show total sales by month for the last year&quot;</p>
          </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex flex-col gap-2',
              message.role === 'user' ? 'items-end' : 'items-start'
            )}
          >
            <div className={cn(
              'max-w-[80%] rounded-lg px-5 py-3 text-base font-medium break-words',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            )}>
              {message.content}
            </div>

            {message.role === 'assistant' && message.sql && (
              <div className="max-w-[80%] w-full overflow-hidden">
                <Card className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-foreground">Generated SQL</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleCopy(message.sql!, message.id)}
                        className="h-6 w-6"
                      >
                        <HugeIcon
                          icon={copiedId === message.id ? CheckmarkCircleIcon : Copy01Icon}
                          size={14}
                        />
                      </Button>
                    </div>
                    <pre className="text-sm bg-muted/50 rounded p-3 overflow-x-auto font-mono font-medium max-w-full">
                      {message.sql}
                    </pre>
                  </CardContent>
                </Card>

                {message.explanation && (
                  <div className="mt-3 text-sm font-medium text-foreground">
                    {message.explanation}
                  </div>
                )}

                {message.chartRecommendation && (
                  <div className="mt-3 text-sm text-foreground flex items-center gap-2 font-medium">
                    <span className="text-muted-foreground">Recommended chart:</span>
                    <span className="font-bold capitalize">{message.chartRecommendation.type}</span>
                    <span className="text-muted-foreground">— {message.chartRecommendation.insight}</span>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground font-medium">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Processing query...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex gap-2">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about your data..."
            className="text-base"
            disabled={isLoading || isPending}
          />
          <Button type="submit" disabled={!inputValue.trim() || isLoading || isPending}>
            <HugeIcon icon={ArrowUpIcon} size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
}

export const ChatInterface = memo(ChatInterfaceComponent);