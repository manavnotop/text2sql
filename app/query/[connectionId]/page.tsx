'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeftIcon } from '@hugeicons/core-free-icons';
import { HugeIcon } from '@/components/ui/icon';
import { useApp } from '@/context/app-context';
import { Sidebar } from '@/components/layout/sidebar';
import { SchemaBrowser } from '@/components/schema/schema-browser';
import { ChatInterface } from '@/components/query/chat-interface';
import { QueryResults } from '@/components/query/query-results';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ChartContainer = dynamic(
  () => import('@/components/charts/chart-container').then(m => ({ default: m.ChartContainer })),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart...</div> }
);

type ChartType = 'bar' | 'line' | 'pie' | 'scatter';

interface QueryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  explanation?: string;
  chartRecommendation?: { type: ChartType; insight: string };
  data?: Record<string, unknown>[];
  timestamp: Date;
}

interface QueryResult {
  id: string;
  question: string;
  sql?: string;
  explanation?: string;
  chartRecommendation?: { type: ChartType; insight: string };
  data: Record<string, unknown>[];
  chartType: ChartType;
  timestamp: Date;
}

export default function QueryPage() {
  const { connection, schema, queryHistory, addQueryMessage, clearQueryHistory, addDashboardWidget } = useApp();
  const [messages, setMessages] = useState<QueryMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentData, setCurrentData] = useState<Record<string, unknown>[]>([]);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [showChart, setShowChart] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'results'>('chat');
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);

  useEffect(() => {
    const messagesFromHistory = queryHistory.map(q => ({
      id: q.id,
      role: q.role,
      content: q.content,
      sql: q.sql,
      explanation: q.explanation,
      chartRecommendation: q.chartType ? { type: q.chartType as ChartType, insight: '' } : undefined,
      data: q.data,
      timestamp: q.timestamp,
    }));
    setMessages(messagesFromHistory);
  }, [queryHistory]);

  const handleClear = useCallback(() => {
    clearQueryHistory();
    setMessages([]);
    setCurrentData([]);
    setShowChart(false);
    setCurrentQuestion('');
    setIsSaved(false);
    setViewMode('chat');
    setQueryResults([]);
    setSelectedResultIndex(null);
  }, [clearQueryHistory]);

  const handleSendMessage = useCallback(async (question: string) => {
    if (!connection || !schema) return;

    setCurrentQuestion(question);
    setIsSaved(false);

    const userMessage: QueryMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    addQueryMessage({ role: 'user', content: question });
    setIsLoading(true);

    try {
      const schemaContext = schema.tables.map(t => 
        `${t.name}: ${t.columns.map(c => c.name).join(', ')}`
      ).join('\n');

      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          schemaContext,
          dbType: connection.type,
          usePreviousContext: messages.length > 0,
          previousQuery: messages[messages.length - 1]?.sql,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const assistantMessage: QueryMessage = {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          content: result.explanation || 'Here are the results of your query.',
          sql: result.sql,
          explanation: result.explanation,
          chartRecommendation: result.chartRecommendation,
          data: result.data,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        addQueryMessage({
          role: 'assistant',
          content: assistantMessage.content,
          sql: assistantMessage.sql,
          explanation: assistantMessage.explanation,
          chartType: assistantMessage.chartRecommendation?.type,
          data: assistantMessage.data,
        });

        const newResult: QueryResult = {
          id: Math.random().toString(36).substring(7),
          question: question,
          sql: result.sql,
          explanation: result.explanation,
          chartRecommendation: result.chartRecommendation,
          data: result.data || [],
          chartType: result.chartRecommendation?.type || 'bar',
          timestamp: new Date(),
        };
        setQueryResults(prev => [...prev, newResult]);
        setSelectedResultIndex(queryResults.length);
        setCurrentData(result.data || []);
        if (result.chartRecommendation) {
          setChartType(result.chartRecommendation.type);
          setShowChart(true);
        }
        setViewMode('results');
      } else {
        const errorMessage: QueryMessage = {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          content: `Error: ${result.error || 'Query execution failed'}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: QueryMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: 'Network error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [connection, schema, messages, addQueryMessage, queryResults.length]);

  const handleTableClick = useCallback((_tableName: string) => {
  }, []);

  const handleColumnClick = useCallback((_tableName: string, _columnName: string) => {
  }, []);

  const handleSaveToDashboard = useCallback(() => {
    if (currentData.length === 0) return;
    
    addDashboardWidget({
      title: currentQuestion || 'Query Result',
      data: currentData,
      chartType: chartType,
      position: { x: 0, y: 0, w: 6, h: 4 },
      query: currentQuestion,
    });
    setIsSaved(true);
  }, [currentData, currentQuestion, chartType, addDashboardWidget]);

  const handleBackToChat = useCallback(() => {
    setViewMode('chat');
    setShowChart(false);
  }, []);

  const handleSelectResult = useCallback((index: number) => {
    const result = queryResults[index];
    if (result) {
      setSelectedResultIndex(index);
      setCurrentData(result.data);
      setChartType(result.chartType);
      setCurrentQuestion(result.question);
      setShowChart(true);
      setViewMode('results');
    }
  }, [queryResults]);

  if (!connection) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">No connection selected. <Link href="/" className="text-primary">Go back</Link></p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden w-full max-w-full box-border">
      <Sidebar className={sidebarCollapsed ? '' : 'border-r'} />

      <div className="flex flex-1 w-full max-w-full box-border">
        <aside className={cn(
          'w-64 border-r border-border bg-card overflow-y-auto transition-all',
          sidebarCollapsed && 'hidden'
        )}>
          <div className="p-3 border-b border-border">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase">Schema</h2>
          </div>
          <SchemaBrowser onTableClick={handleTableClick} onColumnClick={handleColumnClick} />
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden w-full max-w-full box-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-2 min-h-[52px]">
            <div className="flex items-center gap-3">
              {viewMode === 'results' && queryResults.length > 0 && (
                <select
                  value={selectedResultIndex ?? ''}
                  onChange={(e) => handleSelectResult(Number(e.target.value))}
                  className="text-xs border border-border rounded px-2 py-1 bg-background max-w-[200px] truncate"
                >
                  {queryResults.map((result, idx) => (
                    <option key={result.id} value={idx}>
                      {result.question.length > 30 ? result.question.substring(0, 30) + '...' : result.question}
                    </option>
                  ))}
                </select>
              )}
              {viewMode === 'results' && (
                <Button variant="ghost" size="sm" onClick={handleBackToChat}>
                  <HugeIcon icon={ArrowLeftIcon} size={14} className="mr-1" />
                  Back to Chat
                </Button>
              )}
              <div>
                <h1 className="text-sm font-semibold">Query Interface</h1>
                <p className="text-xs text-muted-foreground">{connection.name || connection.database}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {viewMode === 'results' && (
                <Button variant="outline" size="sm" onClick={() => setShowChart(!showChart)}>
                  {showChart ? 'Show Table' : 'Show Chart'}
                </Button>
              )}
              {currentData.length > 0 && viewMode === 'results' && (
                <Button 
                  variant={isSaved ? "ghost" : "default"} 
                  size="sm" 
                  onClick={handleSaveToDashboard}
                  disabled={isSaved}
                >
                  {isSaved ? '✓ Saved' : 'Save to Dashboard'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleClear}>
                Clear
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                {sidebarCollapsed ? '→' : '←'}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden transition-all duration-200 w-full max-w-full">
            {viewMode === 'results' && currentData.length > 0 ? (
              <div className="h-full flex flex-col">
                {showChart ? (
                  <div className="flex-1 p-4 flex flex-col">
                    <div className="mb-4 flex items-center gap-2">
                      {(['bar', 'line', 'pie', 'scatter'] as ChartType[]).map(type => (
                        <button
                          key={type}
                          onClick={() => setChartType(type)}
                          className={cn(
                            'px-3 py-1 text-xs rounded border transition-colors',
                            chartType === type ? 'bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1">
                      {currentData.length > 0 ? (
                        <ChartContainer data={currentData} chartType={chartType} className="h-full" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No data to visualize
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <QueryResults
                    data={currentData}
                    chartRecommendation={{ type: chartType, insight: '' }}
                  />
                )}
              </div>
            ) : (
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                className="h-full w-full"
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}