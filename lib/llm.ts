export interface LLMConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
}

interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterChoice {
  message: {
    content: string;
  };
  finish_reason: string;
}

interface OpenRouterResponse {
  id: string;
  choices: OpenRouterChoice[];
  usage?: OpenRouterUsage;
  model: string;
}

function getConfig(): LLMConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }
  return {
    apiKey,
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-haiku',
  };
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export async function callLLM(
  messages: OpenRouterMessage[],
  config?: Partial<LLMConfig>
): Promise<LLMResponse> {
  const fullConfig = { ...getConfig(), ...config };
  
  const response = await fetch(`${fullConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${fullConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: fullConfig.model,
      messages,
    } as OpenRouterRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as OpenRouterResponse;
  
  return {
    content: data.choices[0]?.message?.content || '',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
    model: data.model,
  };
}

export async function generateSQL(
  userQuestion: string,
  schema: string,
  context?: string
): Promise<{ sql: string; explanation: string }> {
  const systemPrompt = `You are an expert SQL analyst. Generate SQL queries based on natural language questions.

CONTEXT:
- You are working with a SQL database
- Always provide syntactically correct SQL
- Use standard SQL syntax unless specified otherwise

SCHEMA:
${schema}
${context ? `\nADDITIONAL CONTEXT:\n${context}` : ''}

OUTPUT FORMAT:
Return your response as valid JSON with exactly this structure:
{
  "sql": "the SQL query",
  "explanation": "brief explanation of what the query does"
}

Only output the JSON, no other text.`;

  const response = await retryWithBackoff(() =>
    callLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuestion },
    ])
  );

  try {
    const parsed = JSON.parse(response.content) as { sql: string; explanation: string };
    return {
      sql: parsed.sql || '',
      explanation: parsed.explanation || '',
    };
  } catch {
    return {
      sql: response.content,
      explanation: 'Generated SQL query',
    };
  }
}

export async function analyzeResults(
  data: any[],
  question: string
): Promise<{ chartType: string; insight: string }> {
  if (!data || data.length === 0) {
    return {
      chartType: 'table',
      insight: 'No data to analyze',
    };
  }

  const systemPrompt = `You are a data visualization expert. Analyze the provided data and question to recommend the best chart type.

DATA SAMPLE (first 5 rows):
${JSON.stringify(data.slice(0, 5), null, 2)}

QUESTION: ${question}

CHART TYPES: bar, line, pie, scatter, table

OUTPUT FORMAT:
Return your response as valid JSON with exactly this structure:
{
  "chartType": "recommended chart type",
  "insight": "key insight about the data"
}

Only output the JSON, no other text.`;

  const response = await retryWithBackoff(() =>
    callLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Please analyze this data with ${data.length} rows and recommend a visualization.` },
    ])
  );

  try {
    const parsed = JSON.parse(response.content) as { chartType: string; insight: string };
    const validChartTypes = ['bar', 'line', 'pie', 'scatter', 'table'];
    const chartType = validChartTypes.includes(parsed.chartType?.toLowerCase()) 
      ? parsed.chartType.toLowerCase() 
      : 'table';
    
    return {
      chartType,
      insight: parsed.insight || 'Analysis complete',
    };
  } catch {
    return {
      chartType: 'table',
      insight: response.content || 'Unable to analyze data',
    };
  }
}