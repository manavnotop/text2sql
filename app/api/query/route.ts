import { NextRequest, NextResponse } from 'next/server';
import { connectionManager } from '@/lib/db/connection';
import { generateSQL } from '@/lib/llm';
import { validateQuery, QueryExecutor } from '@/lib/query-safety';
import { analyzeResults } from '@/lib/llm';

interface QueryRequestBody {
  question: string;
  schemaContext: string;
  dbType: 'demo' | 'custom';
  usePreviousContext: boolean;
  previousQuery?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: QueryRequestBody = await request.json();

    if (!body.question || typeof body.question !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Question is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.schemaContext || typeof body.schemaContext !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Schema context is required' },
        { status: 400 }
      );
    }

    if (!['demo', 'custom'].includes(body.dbType)) {
      return NextResponse.json(
        { success: false, error: 'dbType must be "demo" or "custom"' },
        { status: 400 }
      );
    }

    let pool;
    if (body.dbType === 'demo') {
      pool = connectionManager.demoPool;
    } else {
      const customConfig = {
        host: process.env.CUSTOM_DB_HOST || '',
        port: parseInt(process.env.CUSTOM_DB_PORT || '5432', 10),
        database: process.env.CUSTOM_DB_NAME || '',
        user: process.env.CUSTOM_DB_USER || '',
        password: process.env.CUSTOM_DB_PASSWORD || '',
      };
      pool = connectionManager.createPool(customConfig);
    }

    let context = body.schemaContext;
    if (body.usePreviousContext && body.previousQuery) {
      context = `Previous query context:\n${body.previousQuery}\n\nCurrent schema:\n${body.schemaContext}`;
    }

    const { sql, explanation } = await generateSQL(body.question, context);

    const validation = validateQuery(sql);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: `SQL validation failed: ${validation.error}` },
        { status: 400 }
      );
    }

    if (validation.warning) {
      console.warn('Query warning:', validation.warning);
    }

    const executor = new QueryExecutor({
      maxRows: 1000,
      timeoutMs: 30000,
    });

    const result = await executor.execute(pool, sql);

    const chartRecommendation = await analyzeResults(result.rows, body.question);

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: result.rows,
      sql,
      explanation,
      chartRecommendation: {
        type: chartRecommendation.chartType,
        insight: chartRecommendation.insight,
      },
      executionTime,
    });
  } catch (error) {
    console.error('Query execution error:', error);
    const executionTime = Date.now() - startTime;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    if (errorMessage.includes('timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query timeout exceeded (30 seconds)',
          executionTime,
        },
        { status: 408 }
      );
    }

    if (errorMessage.includes('validation failed')) {
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          executionTime,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: `Query execution failed: ${errorMessage}`,
        executionTime,
      },
      { status: 500 }
    );
  }
}