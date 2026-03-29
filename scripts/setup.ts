import pg from 'pg';

const { Pool } = pg;

function getClient() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    return new Pool({ connectionString: databaseUrl });
  }

  return new Pool({
    host: process.env.DEMO_DB_HOST || 'localhost',
    port: parseInt(process.env.DEMO_DB_PORT || '5432'),
    database: process.env.DEMO_DB_NAME || 'ecommerce',
    user: process.env.DEMO_DB_USER || 'postgres',
    password: process.env.DEMO_DB_PASSWORD || 'postgres',
  });
}

async function tableExists(client: pg.PoolClient, tableName: string): Promise<boolean> {
  const result = await client.query(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
    [tableName]
  );
  return result.rows[0].exists;
}

async function setup() {
  const pool = getClient();
  const client = await pool.connect();

  try {
    console.log('Setting up database schema...');

    if (await tableExists(client, 'customers')) {
      console.log('Tables already exist. Skipping schema creation.');
      return;
    }

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        segment VARCHAR(50),
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_spend DECIMAL(12, 2) DEFAULT 0,
        order_count INT DEFAULT 0
      );

      CREATE TABLE categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        parent_id UUID REFERENCES categories(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        category_id UUID REFERENCES categories(id),
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );

      CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

      CREATE TABLE orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id UUID REFERENCES customers(id),
        status order_status DEFAULT 'pending',
        total_amount DECIMAL(12, 2) NOT NULL,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        shipped_at TIMESTAMP,
        delivered_at TIMESTAMP
      );

      CREATE TABLE order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id),
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(12, 2) NOT NULL
      );

      CREATE TABLE reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id),
        rating INT CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_customers_email ON customers(email);
      CREATE INDEX idx_customers_segment ON customers(segment);
      CREATE INDEX idx_customers_city ON customers(city);

      CREATE INDEX idx_products_category_id ON products(category_id);
      CREATE INDEX idx_products_sku ON products(sku);

      CREATE INDEX idx_orders_customer_id ON orders(customer_id);
      CREATE INDEX idx_orders_status ON orders(status);
      CREATE INDEX idx_orders_created_at ON orders(created_at);
      CREATE INDEX idx_orders_created_status ON orders(created_at, status);
      CREATE INDEX idx_orders_customer_created ON orders(customer_id, created_at);

      CREATE INDEX idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX idx_order_items_product_id ON order_items(product_id);
      CREATE INDEX idx_order_items_product_order ON order_items(product_id, order_id);

      CREATE INDEX idx_reviews_product_id ON reviews(product_id);
      CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);
    `);

    await client.query(`
      CREATE OR REPLACE VIEW monthly_revenue AS
      SELECT 
        DATE_TRUNC('month', o.created_at) AS month,
        o.city,
        o.state,
        o.country,
        COUNT(DISTINCT o.id) AS order_count,
        SUM(o.total_amount) AS revenue
      FROM orders o
      WHERE o.status NOT IN ('cancelled')
      GROUP BY DATE_TRUNC('month', o.created_at), o.city, o.state, o.country
      ORDER BY month DESC, revenue DESC;
    `);

    await client.query(`
      CREATE OR REPLACE VIEW top_products AS
      SELECT 
        p.id,
        p.name,
        p.sku,
        c.name AS category,
        p.price,
        COUNT(DISTINCT oi.order_id) AS total_orders,
        SUM(oi.quantity) AS units_sold,
        SUM(oi.subtotal) AS total_revenue,
        AVG(oi.unit_price) AS avg_unit_price
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.status NOT IN ('cancelled') OR o.status IS NULL
      GROUP BY p.id, p.name, p.sku, c.name, p.price
      ORDER BY total_revenue DESC NULLS LAST
      LIMIT 20;
    `);

    await client.query(`
      CREATE OR REPLACE VIEW customer_orders AS
      SELECT 
        c.id AS customer_id,
        c.email,
        c.name AS customer_name,
        c.city,
        c.state,
        c.country,
        c.segment,
        o.id AS order_id,
        o.status,
        o.total_amount,
        o.created_at AS order_date,
        o.shipped_at,
        o.delivered_at,
        COUNT(oi.id) AS item_count
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY c.id, o.id
      ORDER BY o.created_at DESC;
    `);

    console.log('Database schema created successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
