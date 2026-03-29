import { Pool, QueryResult, QueryConfig as PoolQueryConfig } from 'pg';

export interface QueryConfig {
  maxRows: number;
  timeoutMs: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export interface QueryExecutionResult extends QueryResult {
  executionTimeMs: number;
}

const DANGEROUS_KEYWORDS = [
  'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE',
  'GRANT', 'REVOKE', 'VACUUM', 'EXECUTE', 'EXEC', 'CALL'
];

const COMMENT_PATTERNS = [
  /--/g,
  /\/\*/g,
  /\*\//g
];

const EXPENSIVE_PATTERNS = [
  { pattern: /JOIN\s+.+(\s+JOIN\s+)+/gi, message: 'Multiple JOINs detected' },
  { pattern: /SELECT\s+.+\s+FROM\s+.+\s+\(.*SELECT/gi, message: 'Nested subquery detected' },
  { pattern: /\bCOUNT\s*\(\s*\*\s*\)/gi, message: 'COUNT(*) may be expensive without proper indexes' }
];

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().toUpperCase();
}

function hasCommentPatterns(sql: string): string | null {
  if (sql.includes('--')) {
    return 'SQL comments (--) detected - possible injection attempt';
  }
  if (sql.includes('/*') || sql.includes('*/')) {
    return 'Block comments (/* */) detected - possible injection attempt';
  }
  return null;
}

function checkDangerousKeywords(sql: string): string | null {
  const normalized = normalizeSql(sql);
  for (const keyword of DANGEROUS_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (pattern.test(normalized)) {
      return `Dangerous keyword detected: ${keyword}`;
    }
  }
  return null;
}

function checkMultipleStatements(sql: string): string | null {
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  if (statements.length > 1) {
    return `Multiple statements detected (${statements.length}). Only single statements are allowed.`;
  }
  return null;
}

function checkExpensivePatterns(sql: string): string | null {
  for (const { pattern, message } of EXPENSIVE_PATTERNS) {
    if (pattern.test(sql)) {
      return `Warning: ${message}`;
    }
  }
  return null;
}

export function validateQuery(sql: string, config?: Partial<QueryConfig>): ValidationResult {
  if (!sql || typeof sql !== 'string') {
    return { isValid: false, error: 'SQL query must be a non-empty string' };
  }

  const trimmedSql = sql.trim();
  if (trimmedSql.length === 0) {
    return { isValid: false, error: 'SQL query cannot be empty' };
  }

  const commentWarning = hasCommentPatterns(trimmedSql);
  if (commentWarning) {
    return { isValid: false, error: commentWarning };
  }

  const keywordError = checkDangerousKeywords(trimmedSql);
  if (keywordError) {
    return { isValid: false, error: keywordError };
  }

  const statementError = checkMultipleStatements(trimmedSql);
  if (statementError) {
    return { isValid: false, error: statementError };
  }

  const expensiveWarning = checkExpensivePatterns(trimmedSql);

  return {
    isValid: true,
    warning: expensiveWarning ?? undefined
  };
}

export function sanitizeIdentifier(identifier: string): string {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error('Identifier must be a non-empty string');
  }

  const sanitized = identifier.replace(/["`\[\];]/g, '');

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sanitized)) {
    throw new Error(`Invalid identifier format: ${identifier}`);
  }

  return sanitized;
}

export class QueryExecutor {
  private defaultConfig: QueryConfig = {
    maxRows: 1000,
    timeoutMs: 30000
  };

  constructor(defaults?: Partial<QueryConfig>) {
    if (defaults) {
      this.defaultConfig = { ...this.defaultConfig, ...defaults };
    }
  }

  async execute(
    pool: Pool,
    sql: string,
    config?: Partial<QueryConfig>
  ): Promise<QueryExecutionResult> {
    const mergedConfig: QueryConfig = { ...this.defaultConfig, ...config };

    const validation = validateQuery(sql, mergedConfig);
    if (!validation.isValid) {
      throw new Error(`Query validation failed: ${validation.error}`);
    }

    const startTime = Date.now();

    const queryPromise = pool.query(sql);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Query timeout exceeded (${mergedConfig.timeoutMs}ms)`)),
        mergedConfig.timeoutMs
      );
    });

    let result;
    try {
      result = await Promise.race([queryPromise, timeoutPromise]);
    } catch (err) {
      if (err instanceof Error && err.message.includes('timeout')) {
        throw err;
      }
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Query execution error details:', err);
      throw new Error(`Query execution failed: ${errorMsg || 'Unknown error - check database connection'}`);
    }

    const executionTimeMs = Date.now() - startTime;

    const truncatedResult: QueryExecutionResult = {
      ...result,
      rows: result.rows.slice(0, mergedConfig.maxRows),
      executionTimeMs
    };

    if (result.rows.length > mergedConfig.maxRows) {
      console.warn(
        `Result truncated: ${result.rows.length} rows -> ${mergedConfig.maxRows} rows`
      );
    }

    return truncatedResult;
  }

  formatResults(result: QueryExecutionResult): string {
    if (result.rows.length === 0) {
      return 'No results returned.';
    }

    const columns = result.fields.map(f => f.name);
    const columnWidths = columns.map(col =>
      Math.max(col.length, ...result.rows.map(row => String(row[col] ?? '').length))
    );

    const header = columns.map((col, i) => col.padEnd(columnWidths[i])).join(' | ');
    const separator = columnWidths.map(w => '-'.repeat(w)).join('-+-');
    const dataRows = result.rows.map(row =>
      columns.map((col, i) => String(row[col] ?? '').padEnd(columnWidths[i])).join(' | ')
    );

    return [
      header,
      separator,
      ...dataRows,
      '',
      `${result.rows.length} rows returned in ${result.executionTimeMs}ms`
    ].join('\n');
  }
}