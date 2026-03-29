import { Pool, PoolConfig as PgPoolConfig } from 'pg';

export interface PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

interface ConnectionManagerOptions {
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

function getEnvVar(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}

export function getConnectionString(config?: PoolConfig): string {
  if (config) {
    return `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
  }

  const url = getEnvVar('DATABASE_URL');
  if (url) {
    return url;
  }

  const host = getEnvVar('DEMO_DB_HOST', 'localhost');
  const port = getEnvVar('DEMO_DB_PORT', '5432');
  const database = getEnvVar('DEMO_DB_NAME', 'demo');
  const user = getEnvVar('DEMO_DB_USER', 'postgres');
  const password = getEnvVar('DEMO_DB_PASSWORD', '');

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

export class ConnectionManager {
  public demoPool: Pool;

  constructor() {
    const demoConnectionString = getConnectionString();
    this.demoPool = new Pool({
      connectionString: demoConnectionString,
    });

    this.demoPool.on('error', (err) => {
      console.error('Unexpected demo pool error:', err.message);
    });
  }

  createPool(config: PoolConfig, options?: ConnectionManagerOptions): Pool {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: options?.max ?? 10,
      idleTimeoutMillis: options?.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: options?.connectionTimeoutMillis ?? 5000,
    };

    const pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err.message);
    });

    return pool;
  }

  async testConnection(pool: Pool): Promise<boolean> {
    try {
      const client = await pool.connect();
      client.release();
      return true;
    } catch (error) {
      console.error('Connection test failed:', (error as Error).message);
      return false;
    }
  }

  async closeDemoPool(): Promise<void> {
    try {
      await this.demoPool.end();
    } catch (error) {
      console.error('Error closing demo pool:', (error as Error).message);
    }
  }
}

export const connectionManager = new ConnectionManager();
