import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

interface ConnectionConfig {
  id: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  name?: string;
  createdAt: string;
}

interface SchemaInfo {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
    }>;
  }>;
}

const savedConnections = new Map<string, ConnectionConfig>();

async function analyzeSchema(pool: Pool): Promise<SchemaInfo> {
  const result: SchemaInfo = { tables: [] };

  try {
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    for (const row of tablesResult.rows) {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [row.table_name]);

      result.tables.push({
        name: row.table_name,
        columns: columnsResult.rows.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
        })),
      });
    }
  } catch (error) {
    console.error('Schema analysis error:', error);
  }

  return result;
}

function validateConnection(body: {
  host?: unknown;
  port?: unknown;
  database?: unknown;
  user?: unknown;
  password?: unknown;
  name?: unknown;
}): { valid: boolean; error?: string } {
  if (!body.host || typeof body.host !== 'string' || body.host.trim() === '') {
    return { valid: false, error: 'Host is required' };
  }

  if (!body.port || typeof body.port !== 'number' || body.port < 1 || body.port > 65535) {
    return { valid: false, error: 'Port must be a valid number between 1 and 65535' };
  }

  if (!body.database || typeof body.database !== 'string' || body.database.trim() === '') {
    return { valid: false, error: 'Database name is required' };
  }

  if (!body.user || typeof body.user !== 'string' || body.user.trim() === '') {
    return { valid: false, error: 'User is required' };
  }

  if (!body.password || typeof body.password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (body.name !== undefined && typeof body.name !== 'string') {
    return { valid: false, error: 'Name must be a string' };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateConnection(body);

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const pool = new Pool({
      host: body.host,
      port: body.port,
      database: body.database,
      user: body.user,
      password: body.password,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 5000,
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      const schema = await analyzeSchema(pool);

      const connectionId = uuidv4();
      const connection: ConnectionConfig = {
        id: connectionId,
        host: body.host,
        port: body.port,
        database: body.database,
        user: body.user,
        password: body.password,
        name: body.name,
        createdAt: new Date().toISOString(),
      };
      savedConnections.set(connectionId, connection);

      await pool.end();

      return NextResponse.json({
        success: true,
        message: 'Connection successful',
        connectionId,
        schema,
      });
    } catch (error) {
      await pool.end().catch(() => {});
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: `Connection failed: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Connection failed: ${errorMessage}` },
      { status: 400 }
    );
  }
}

export async function GET() {
  const connections = Array.from(savedConnections.values()).map(conn => ({
    id: conn.id,
    host: conn.host,
    port: conn.port,
    database: conn.database,
    user: conn.user,
    name: conn.name,
    createdAt: conn.createdAt,
  }));

  return NextResponse.json({ connections });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');

  if (!connectionId) {
    return NextResponse.json(
      { success: false, error: 'Connection ID is required' },
      { status: 400 }
    );
  }

  if (!savedConnections.has(connectionId)) {
    return NextResponse.json(
      { success: false, error: 'Connection not found' },
      { status: 404 }
    );
  }

  savedConnections.delete(connectionId);

  return NextResponse.json({ success: true, message: 'Connection removed' });
}