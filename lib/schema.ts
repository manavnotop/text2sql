import { Pool, PoolClient } from 'pg';

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references: { table: string; column: string } | null;
  sampleValues: string[];
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  sampleValues: Record<string, string[]>[];
}

export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface SchemaAnalysis {
  tables: TableInfo[];
  relationships: Relationship[];
  summary: {
    totalTables: number;
    totalColumns: number;
    totalRelationships: number;
  };
}

export async function analyzeSchema(pool: Pool): Promise<SchemaAnalysis> {
  const tables: TableInfo[] = [];
  const relationships: Relationship[] = [];

  const tablesResult = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const primaryKeysQuery = await pool.query(`
    SELECT kcu.table_name, kcu.column_name
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
    AND kcu.table_schema = 'public'
  `);

  const primaryKeysMap = new Map<string, string[]>();
  for (const row of primaryKeysQuery.rows) {
    const tableName = row.table_name;
    if (!primaryKeysMap.has(tableName)) {
      primaryKeysMap.set(tableName, []);
    }
    primaryKeysMap.get(tableName)!.push(row.column_name);
  }

  const foreignKeysQuery = await pool.query(`
    SELECT
      kcu.table_name AS from_table,
      kcu.column_name AS from_column,
      ccu.table_name AS to_table,
      ccu.column_name AS to_column
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = kcu.constraint_name
    WHERE kcu.table_schema = 'public'
    AND ccu.table_schema = 'public'
    AND kcu.constraint_name IN (
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
      AND table_schema = 'public'
    )
  `);

  for (const row of foreignKeysQuery.rows) {
    relationships.push({
      fromTable: row.from_table,
      fromColumn: row.from_column,
      toTable: row.to_table,
      toColumn: row.to_column,
    });
  }

  for (const tableRow of tablesResult.rows) {
    const tableName = tableRow.table_name;

    const columnsResult = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    const columns: ColumnInfo[] = [];
    const pkColumns = primaryKeysMap.get(tableName) || [];

    for (const colRow of columnsResult.rows) {
      const colName = colRow.column_name;
      const isPK = pkColumns.includes(colName);
      const fkRelation = relationships.find(r => r.fromTable === tableName && r.fromColumn === colName);

      let sampleValues: string[] = [];
      try {
        const sampleResult = await pool.query(
          `SELECT * FROM "${tableName}" LIMIT 3`
        );
        sampleValues = sampleResult.rows.map(row => {
          const val = row[colName];
          if (val === null || val === undefined) return 'NULL';
          return String(val);
        });
      } catch {
        sampleValues = [];
      }

      columns.push({
        name: colName,
        type: colRow.data_type,
        nullable: colRow.is_nullable === 'YES',
        isPrimaryKey: isPK,
        isForeignKey: !!fkRelation,
        references: fkRelation ? { table: fkRelation.toTable, column: fkRelation.toColumn } : null,
        sampleValues,
      });
    }

    let tableSampleValues: Record<string, string[]>[] = [];
    try {
      const sampleResult = await pool.query(
        `SELECT * FROM "${tableName}" LIMIT 3`
      );
      tableSampleValues = sampleResult.rows.map(row => {
        const obj: Record<string, string[]> = {};
        for (const col of columns) {
          const val = row[col.name];
          obj[col.name] = val === null || val === undefined ? ['NULL'] : [String(val)];
        }
        return obj;
      });
    } catch {
      tableSampleValues = [];
    }

    tables.push({
      name: tableName,
      columns,
      sampleValues: tableSampleValues,
    });
  }

  return {
    tables,
    relationships,
    summary: {
      totalTables: tables.length,
      totalColumns: tables.reduce((acc, t) => acc + t.columns.length, 0),
      totalRelationships: relationships.length,
    },
  };
}

export function formatSchemaForLLM(analysis: SchemaAnalysis): string {
  const lines: string[] = [];
  lines.push('## Database Schema\n');

  for (const table of analysis.tables) {
    lines.push(`### Table: ${table.name}\n`);
    lines.push('| Column | Type | Nullable | PK | FK | References | Sample |');
    lines.push('|--------|------|----------|----|----|------------|--------|');

    for (const col of table.columns) {
      const refs = col.references ? `${col.references.table}.${col.references.column}` : '-';
      const sample = col.sampleValues.slice(0, 2).join(', ') || '-';
      lines.push(
        `| ${col.name} | ${col.type} | ${col.nullable ? 'Yes' : 'No'} | ${col.isPrimaryKey ? 'Yes' : 'No'} | ${col.isForeignKey ? 'Yes' : 'No'} | ${refs} | ${sample} |`
      );
    }
    lines.push('');
  }

  if (analysis.relationships.length > 0) {
    lines.push('## Relationships\n');
    lines.push('| From | To |');
    lines.push('|------|----|');
    for (const rel of analysis.relationships) {
      lines.push(`| ${rel.fromTable}.${rel.fromColumn} | ${rel.toTable}.${rel.toColumn} |`);
    }
    lines.push('');
  }

  lines.push('## Summary\n');
  lines.push(`- Total Tables: ${analysis.summary.totalTables}`);
  lines.push(`- Total Columns: ${analysis.summary.totalColumns}`);
  lines.push(`- Total Relationships: ${analysis.summary.totalRelationships}`);

  return lines.join('\n');
}