# QueryForge - Conversational BI Platform

[//]: # (![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue))
[//]: # (![Next.js](https://img.shields.io/badge/Next.js-16.2-black))
[//]: # (![PostgreSQL](https://img.shields.io/badge/PostgreSQL-416982?logo=postgresql))
[//]: # (![License](https://img.shields.io/badge/License-MIT-green))

QueryForge is a conversational business intelligence platform that transforms natural language questions into SQL queries, enabling users to explore and visualize data without writing code.

## Description

QueryForge bridges the gap between business users and data by leveraging large language models to convert plain English questions into optimized SQL queries. The platform includes a pre-seeded demo database with 10,000+ orders for immediate exploration, while also supporting custom database connections for production use.

## Approach

This platform was built from scratch with custom SQL generation logic:

1. **Demo Database First** - Pre-seeded with 10K+ orders using Faker.js so users can explore immediately without connecting their own database
2. **Schema Introspection** - On connection, automatically extracts tables, columns, types, and relationships to build context for the LLM
3. **Natural Language to SQL** - Sends user question + schema context to LLM, which generates PostgreSQL queries
4. **Query Safety** - Validates queries before execution: blocks destructive operations (DROP, DELETE), limits row counts, enforces timeouts
5. **Smart Visualizations** - Analyzes result data shape to recommend optimal chart types (bar, line, pie, scatter, table)
6. **Dashboard Persistence** - Users can save query results as widgets and arrange them into shareable dashboards

## Features

- **Natural Language to SQL**: Convert questions like "What are our top-selling products?" into executable SQL queries
- **Demo Database**: Pre-seeded with 10,000+ orders, 500 customers, 500 products, and 50 categories
- **Custom Database Connections**: Connect to your own PostgreSQL database
- **Auto-generated Schema Analysis**: Automatically analyzes table structures, columns, and relationships
- **Chart Recommendations**: Suggests optimal visualization types (bar, line, pie, scatter, table) based on data
- **Dashboard Creation**: Build and share custom dashboards with multiple widgets

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| TypeScript | Type-safe development |
| PostgreSQL | Database |
| OpenRouter | LLM API (Claude, GPT, etc.) |
| pg | PostgreSQL Node.js driver |
| Bun | Runtime and package manager |

## Prerequisites

- Node.js 18+ or Bun 1.0+
- PostgreSQL 14+ (local or cloud)

## Setup Instructions

### 1. Clone and Install

```bash
cd my-app
bun install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```bash
# Demo Database (required for seeded data)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce

# OpenRouter API Key (required for LLM)
OPENROUTER_API_KEY=your_api_key_here

# Optional - Override defaults
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=anthropic/claude-3.5-haiku

# Custom Database Connection (optional)
# CUSTOM_DB_HOST=localhost
# CUSTOM_DB_PORT=5432
# CUSTOM_DB_NAME=your_database
# CUSTOM_DB_USER=your_user
# CUSTOM_DB_PASSWORD=your_password
```

### 3. Database Setup

Create the database schema:

```bash
bun run db:setup
```

This creates the following tables:
- `customers` - Customer information with segment (regular/premium/vip)
- `categories` — Product categories (50 pre-seeded)
- `products` — Products linked to categories
- `orders` — Orders with status tracking
- `order_items` — Order line items
- `reviews` — Product reviews

And views:
- `monthly_revenue` — Revenue aggregation by month
- `top_products` — Best-selling products
- `customer_orders` — Customer order history

### 4. Database Seeding

Seed the demo database with sample data:

```bash
bun run db:seed
```

This populates:
| Table | Records |
|-------|---------|
| customers | 500 |
| categories | 50 |
| products | 500 |
| orders | 10,000+ |
| order_items | 25,000+ |
| reviews | 5,000 |

### 5. Run the Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string for demo database |
| `OPENROUTER_API_KEY` | Yes | API key from [OpenRouter](https://openrouter.ai/) |
| `OPENROUTER_BASE_URL` | No | Override default OpenRouter endpoint |
| `OPENROUTER_MODEL` | No | Default: `anthropic/claude-3.5-haiku` |
| `CUSTOM_DB_HOST` | No | Custom database host |
| `CUSTOM_DB_PORT` | No | Custom database port (default: 5432) |
| `CUSTOM_DB_NAME` | No | Custom database name |
| `CUSTOM_DB_USER` | No | Custom database user |
| `CUSTOM_DB_PASSWORD` | No | Custom database password |

## API Endpoints

### POST /api/query

Execute a natural language query.

**Request:**
```json
{
  "question": "What are our top 10 products by revenue?",
  "schemaContext": "Table: products\nColumns: id, name, price...",
  "dbType": "demo",
  "usePreviousContext": false
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "sql": "SELECT p.name, SUM(oi.subtotal)...",
  "explanation": "This query finds the top 10 products...",
  "chartRecommendation": {
    "type": "bar",
    "insight": "Visualize revenue by product"
  },
  "executionTime": 1234
}
```

### GET /api/schema

Get the database schema.

**Query Parameters:**
- `type` — `demo` or `custom`

**Response:**
```json
{
  "success": true,
  "schema": {
    "tables": [...],
    "relationships": [...],
    "formattedSchema": "..."
  }
}
```

### POST /api/connect

Test a database connection.

**Request:**
```json
{
  "host": "localhost",
  "port": 5432,
  "database": "mydb",
  "user": "postgres",
  "password": "secret",
  "name": "My Production DB"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "connectionId": "uuid",
  "schema": { "tables": [...] }
}
```

### /api/dashboards

Dashboard CRUD operations.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboards | List all dashboards |
| POST | /api/dashboards | Create dashboard |
| GET | /api/dashboards/[id] | Get dashboard |
| PUT | /api/dashboards/[id] | Update dashboard |
| DELETE | /api/dashboards/[id] | Delete dashboard |
| POST | /api/dashboards/[id]/share | Generate share link |

## Database Schema

### Tables

```
customers
├── id (UUID, PK)
├── email (VARCHAR)
├── name (VARCHAR)
├── segment (VARCHAR) — regular/premium/vip
├── city (VARCHAR)
├── state (VARCHAR)
├── country (VARCHAR)
├── created_at (TIMESTAMP)
├── total_spend (DECIMAL)
└── order_count (INT)

categories
├── id (UUID, PK)
├── name (VARCHAR)
├── description (TEXT)
└── parent_id (UUID, FK)

products
├── id (UUID, PK)
├── name (VARCHAR)
├── sku (VARCHAR)
├── description (TEXT)
├── category_id (UUID, FK)
├── price (DECIMAL)
├── created_at (TIMESTAMP)
└── is_active (BOOLEAN)

orders
├── id (UUID, PK)
├── customer_id (UUID, FK)
├── status (ENUM) — pending/processing/shipped/delivered/cancelled
├── total_amount (DECIMAL)
├── created_at (TIMESTAMP)
├── shipped_at (TIMESTAMP)
└── delivered_at (TIMESTAMP)

order_items
├── id (UUID, PK)
├── order_id (UUID, FK)
├── product_id (UUID, FK)
├── quantity (INT)
├── unit_price (DECIMAL)
└── subtotal (DECIMAL)

reviews
├── id (UUID, PK)
├── product_id (UUID, FK)
├── customer_id (UUID, FK)
├── rating (INT, 1-5)
├── comment (TEXT)
└── created_at (TIMESTAMP)
```

### Views

- `monthly_revenue` — Revenue by month
- `top_products` — Top 20 products by revenue
- `customer_orders` — Full customer order history

## Example Queries

The platform handles natural language queries like:

| Question | SQL Generated |
|----------|---------------|
| "Show me total revenue by month" | SELECT DATE_TRUNC('month', created_at), SUM(total_amount) FROM orders... |
| "What are our top 10 customers?" | SELECT c.name, SUM(o.total_amount) FROM customers c JOIN orders o... |
| "How many orders are pending?" | SELECT COUNT(*) FROM orders WHERE status = 'pending' |
| "Show revenue by product category" | SELECT cat.name, SUM(oi.subtotal) FROM categories... |
| "What percentage of orders were cancelled?" | SELECT (COUNT(*) FILTER WHERE status = 'cancelled') * 100.0 / COUNT(*)... |
| "List customers from California" | SELECT * FROM customers WHERE state = 'California' |

## Development

### Available Scripts

```bash
bun run dev          # Start development server
bun run build       # Build for production
bun run start      # Start production server
bun run lint       # Run ESLint
bun run db:setup   # Setup database schema
bun run db:seed    # Seed demo database
```

### Project Structure

```
my-app/
├── app/
│   ├── api/
│   │   ├── query/       # Natural language query endpoint
│   │   ├── schema/     # Schema analysis endpoint
│   │   ├── connect/    # Database connection testing
│   │   └── dashboards/ # Dashboard CRUD
│   ├── page.tsx        # Main application page
│   └── layout.tsx      # Root layout
├── lib/
│   ├── db/connection.ts  # Database connection manager
│   ├── schema.ts       # Schema analysis
│   ├── llm.ts         # LLM integration
│   └── query-safety.ts # Query validation
├── scripts/
│   ├── setup.ts       # Database setup
│   └── seed.ts       # Demo data seeding
└── package.json
```

## Architecture

```mermaid
graph TB
    subgraph Client["Frontend (Next.js React)"]
        UI[User Interface]
        Chat[Chat Interface]
        Charts[Chart Visualization]
        Dashboards[Dashboards]
    end

    subgraph NextJS["Next.js API Routes"]
        QueryAPI["/api/query"]
        SchemaAPI["/api/schema"]
        ConnectAPI["/api/connect"]
        DashboardAPI["/api/dashboards"]
    end

    subgraph Lib["Core Libraries"]
        LLM[LLM Integration]
        Schema[Schema Analysis]
        QuerySafety[Query Safety]
        ChartRec[Chart Recommendation]
    end

    subgraph Database["Database Layer"]
        DemoDB[Demo Database<br/>10K+ Orders]
        CustomDB[Custom User Database]
        ConnectionMgr[Connection Manager]
    end

    UI --> QueryAPI
    UI --> SchemaAPI
    UI --> ConnectAPI
    UI --> DashboardAPI

    QueryAPI --> LLM
    QueryAPI --> QuerySafety
    QueryAPI --> ChartRec
    
    SchemaAPI --> Schema
    ConnectAPI --> ConnectionMgr
    
    LLM --> Schema
    Schema --> DemoDB
    Schema --> CustomDB
    
    QuerySafety --> DemoDB
    QuerySafety --> CustomDB
    
    Charts --> ChartRec
    
    DemoDB ---|Faker.js Seed| Seed[Seed Script]
```

### Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant LLM
    participant DB
    
    User->>Frontend: "What are top products?"
    Frontend->>LLM: question + schema context
    LLM-->>Frontend: SQL query
    Frontend->>DB: Execute SQL
    DB-->>Frontend: Results
    Frontend->>Frontend: Recommend chart type
    Frontend-->>User: Bar chart + table
```

## Deployment

### Vercel (Recommended)

1. Fork or push this repository to GitHub
2. Import the project at [vercel.com](https://vercel.com)
3. Configure environment variables in Vercel dashboard
4. Deploy

### Environment Variables on Vercel

Add the following Environment Variables in the Vercel dashboard:

- `DATABASE_URL` — Your PostgreSQL connection string
- `OPENROUTER_API_KEY` — Your OpenRouter API key

### Docker (Alternative)

```dockerfile
FROM oven/bun:1

WORKDIR /app
COPY . .
RUN bun install

ENV DATABASE_URL=postgresql://...
ENV OPENROUTER_API_KEY=...

EXPOSE 3000
CMD ["bun", "run", "start"]
```

### Other Platforms

For other deployment platforms, ensure:

1. Node.js/Bun runtime is available
2. PostgreSQL database is accessible
3. Environment variables are configured
4. Port 3000 is exposed

## Security Notes

- Query validation prevents SQL injection attacks
- Custom database credentials are not stored persistently
- API keys should be kept secure and rotated regularly

## License

MIT