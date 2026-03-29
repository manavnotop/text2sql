import { NextRequest, NextResponse } from 'next/server';
import { connectionManager } from '@/lib/db/connection';
import { analyzeSchema, formatSchemaForLLM, SchemaAnalysis } from '@/lib/schema';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface RequestBody {
  config?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'demo';

    let pool;

    if (type === 'demo') {
      pool = connectionManager.demoPool;
    } else if (type === 'custom') {
      let config: RequestBody['config'];

      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          const body = await request.json();
          config = body.config;
        } catch {
          return NextResponse.json(
            { success: false, error: 'Invalid JSON body' },
            { status: 400, headers: CORS_HEADERS }
          );
        }
      }

      if (!config) {
        const sessionConfig = searchParams.get('config');
        if (sessionConfig) {
          try {
            config = JSON.parse(Buffer.from(sessionConfig, 'base64').toString());
          } catch {
            return NextResponse.json(
              { success: false, error: 'Invalid session config' },
              { status: 400, headers: CORS_HEADERS }
            );
          }
        }
      }

      if (!config) {
        return NextResponse.json(
          { success: false, error: 'Custom type requires connection config in body or session' },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      pool = connectionManager.createPool(config);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Use ?type=demo or ?type=custom' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const analysis: SchemaAnalysis = await analyzeSchema(pool);
    const formattedSchema = formatSchemaForLLM(analysis);

    const tables = analysis.tables.map(t => ({
      name: t.name,
      columns: t.columns.map(c => ({
        name: c.name,
        type: c.type,
        nullable: c.nullable,
        isPrimaryKey: c.isPrimaryKey,
        isForeignKey: c.isForeignKey,
      })),
    }));

    const relationships = analysis.relationships.map(r => ({
      from: `${r.fromTable}.${r.fromColumn}`,
      to: `${r.toTable}.${r.toColumn}`,
      type: 'foreign_key',
    }));

    return NextResponse.json(
      {
        success: true,
        schema: {
          tables,
          relationships,
          formattedSchema,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('Schema analysis error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}