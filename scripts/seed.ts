import { faker } from '@faker-js/faker';
import { Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const BATCH_SIZE = 500;

function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    };
  }
  return {
    host: process.env.DEMO_DB_HOST || 'localhost',
    port: parseInt(process.env.DEMO_DB_PORT || '5432'),
    user: process.env.DEMO_DB_USER || 'postgres',
    password: process.env.DEMO_DB_PASSWORD || 'postgres',
    database: process.env.DEMO_DB_NAME || 'postgres',
  };
}

async function connectWithRetry(maxRetries = 5): Promise<Client> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const config = getDatabaseConfig();
      const client = new Client(config);
      await client.connect();
      console.log('Connected to PostgreSQL');
      return client;
    } catch (error) {
      retries++;
      console.log(`Connection attempt ${retries} failed, retrying in 2s...`);
      if (retries >= maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Failed to connect after retries');
}

async function verifyTablesExist(client: Client): Promise<boolean> {
  try {
    await client.query('SELECT 1 FROM customers LIMIT 1');
    return true;
  } catch {
    return false;
  }
}

async function batchInsert(client: Client, table: string, columns: string, values: any[][]): Promise<void> {
  if (values.length === 0) return;
  const columnCount = columns.split(',').length;
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const batch = values.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map((row, ri) =>
      `(${row.map((_: any, ci: number) => `$${i * columnCount + ri * row.length + ci + 1}`).join(', ')})`
    ).join(', ');
    const flatValues = batch.flat();
    await client.query(`INSERT INTO ${table} (${columns}) VALUES ${placeholders}`, flatValues);
    console.log(`  [${table}] Inserted ${Math.min(i + BATCH_SIZE, values.length)}/${values.length} rows`);
  }
}

function getSegmentData() {
  const rand = Math.random();
  if (rand < 0.1) {
    return { segment: 'vip', orderCount: faker.number.int({ min: 15, max: 50 }) };
  } else if (rand < 0.3) {
    return { segment: 'premium', orderCount: faker.number.int({ min: 5, max: 14 }) };
  } else {
    return { segment: 'regular', orderCount: faker.number.int({ min: 1, max: 5 }) };
  }
}

function getWeightedDate(): Date {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  
  const monthWeights = [0.7, 0.7, 0.8, 0.9, 1.0, 1.0, 0.9, 1.0, 1.0, 1.1, 1.5, 1.8];
  const dayWeights: number[] = [];
  
  for (let i = 0; i < 365; i++) {
    const date = new Date(twelveMonthsAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const month = date.getMonth();
    const dayOfWeek = date.getDay();
    
    let weight = monthWeights[month];
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weight *= 1.2;
    }
    
    const dayFromEnd = 365 - i;
    weight *= Math.pow(dayFromEnd / 100, 1.5);
    
    dayWeights.push(weight);
  }
  
  const totalWeight = dayWeights.reduce((a, b) => a + b, 0);
  
  let random = Math.random() * totalWeight;
  for (let i = 0; i < dayWeights.length; i++) {
    random -= dayWeights[i];
    if (random <= 0) {
      return new Date(twelveMonthsAgo.getTime() + i * 24 * 60 * 60 * 1000);
    }
  }
  return now;
}

async function truncateTables(client: Client): Promise<void> {
  await client.query('TRUNCATE reviews, order_items, orders, products, categories, customers CASCADE');
}

async function seedCustomers(client: Client): Promise<any[]> {
  console.log('Seeding 500 customers...');
  
  const customers: any[] = [];
  for (let i = 0; i < 500; i++) {
    const { segment, orderCount } = getSegmentData();
    customers.push({
      id: uuidv4(),
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      segment,
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: false }),
      country: faker.location.country(),
      created_at: faker.date.past({ years: 2 }),
      total_spend: 0,
      order_count: orderCount,
    });
  }
  
  await batchInsert(client, 'customers', 'id, name, email, segment, city, state, country, created_at, total_spend, order_count',
    customers.map(c => [c.id, c.name, c.email, c.segment, c.city, c.state, c.country, c.created_at, 0, 0]));
  console.log('500 customers seeded');
  return customers;
}

async function seedCategories(client: Client): Promise<any[]> {
  console.log('Seeding 50 categories...');
  const categoryNames = [
    'Electronics', 'Computers', 'Smartphones', 'Tablets', 'Cameras', 'Audio Equipment',
    'Clothing', 'Men\'s Fashion', 'Women\'s Fashion', 'Children\'s Clothing', 'Shoes', 'Accessories',
    'Home & Garden', 'Furniture', 'Kitchen', 'Bedding', 'Decor', 'Tools',
    'Sports', 'Fitness', 'Outdoor', 'Camping', 'Team Sports', 'Water Sports',
    'Books', 'Fiction', 'Non-Fiction', 'Children\'s Books', 'Educational', 'Magazines',
    'Toys & Games', 'Video Games', 'Board Games', 'Educational Toys', 'Action Figures',
    'Beauty & Personal Care', 'Cosmetics', 'Skincare', 'Hair Care', 'Fragrances',
    'Food & Grocery', 'Snacks', 'Beverages', 'Organic', 'International',
    'Automotive', 'Parts', 'Car Accessories', 'Tools Equipment', 'Car Care',
    'Health & Wellness', 'Vitamins', 'Supplements', 'Medical Supplies', 'Fitness Equipment',
    'Pet Supplies', 'Dog Food', 'Cat Food', 'Pet Toys', 'Pet Care',
    'Office Supplies', 'Stationery', 'Office Furniture', 'Printers', 'Organizers',
    'Jewelry', 'Watches', 'Rings', 'Necklaces', 'Earrings'
  ];
  
  const categories = categoryNames.map(name => ({
    id: uuidv4(),
    name,
    description: faker.commerce.productDescription(),
    created_at: faker.date.past({ years: 3 }),
  }));
  
  await batchInsert(client, 'categories', 'id, name, description, created_at',
    categories.map(c => [c.id, c.name, c.description, c.created_at]));
  console.log('50 categories seeded');
  return categories;
}

async function seedProducts(client: Client, categories: any[]): Promise<any[]> {
  console.log('Seeding 500 products...');
  const products: any[] = [];
  
  for (let i = 0; i < 500; i++) {
    const category = categories[i % categories.length];
    products.push({
      id: uuidv4(),
      category_id: category.id,
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      sku: `SKU-${String(i + 1).padStart(5, '0')}`,
      price: parseFloat(faker.commerce.price({ min: 9.99, max: 999.99 })),
      created_at: faker.date.past({ years: 2 }),
    });
  }
  
  await batchInsert(client, 'products', 'id, category_id, name, description, sku, price, created_at',
    products.map(p => [p.id, p.category_id, p.name, p.description, p.sku, p.price, p.created_at]));
  console.log('500 products seeded');
  return products;
}

async function seedOrdersAndItems(client: Client, customers: any[], products: any[]): Promise<{orderIdToItems: Map<string, any[]>, orderIdToCustomerId: Map<string, string>}> {
  console.log('Seeding 10,000 orders with order items...');
  
  const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  const statusesWeights = [0.1, 0.15, 0.2, 0.5, 0.05];
  
  const popularProducts = products.slice(0, 50);
  
  let totalOrders = 0;
  let totalItems = 0;
  
  // First pass: collect all orders and items in memory
  const allOrders: any[] = [];
  const allOrderItems: any[] = [];
  const orderIdToItems: Map<string, any[]> = new Map();
  const orderIdToCustomerId: Map<string, string> = new Map();
  
  for (const customer of customers) {
    const numOrders = customer.order_count;
    
    for (let o = 0; o < numOrders; o++) {
      const orderId = uuidv4();
      const createdAt = getWeightedDate();
      
      let rand = Math.random();
      let statusIndex = 0;
      let cumulative = 0;
      for (let i = 0; i < statusesWeights.length; i++) {
        cumulative += statusesWeights[i];
        if (rand <= cumulative) {
          statusIndex = i;
          break;
        }
      }
      
      const itemCount = faker.number.int({ min: 1, max: 4 });
      const orderItems: any[] = [];
      let orderTotal = 0;
      
      for (let i = 0; i < itemCount; i++) {
        const usePopular = Math.random() < 0.7;
        const product = usePopular 
          ? popularProducts[Math.floor(Math.random() * popularProducts.length)]
          : products[Math.floor(Math.random() * products.length)];
        const quantity = faker.number.int({ min: 1, max: 3 });
        const subtotal = parseFloat((product.price * quantity).toFixed(2));
        orderTotal += subtotal;
        
        const orderItem = {
          id: uuidv4(),
          order_id: orderId,
          product_id: product.id,
          quantity,
          unit_price: product.price,
          subtotal,
        };
        
        orderItems.push(orderItem);
        allOrderItems.push(orderItem);
      }
      
      orderIdToItems.set(orderId, orderItems);
      orderIdToCustomerId.set(orderId, customer.id);
      
      allOrders.push({
        id: orderId,
        customer_id: customer.id,
        status: statuses[statusIndex],
        total_amount: parseFloat(orderTotal.toFixed(2)),
        city: customer.city,
        state: customer.state,
        country: customer.country,
        created_at: createdAt,
      });
    }
  }
  
  // Second pass: insert orders in batches
  for (let i = 0; i < allOrders.length; i += BATCH_SIZE) {
    const batch = allOrders.slice(i, i + BATCH_SIZE);
    if (batch.length === 0) continue;
    
    // Generate multi-value insert - fix parameter indexing per batch
    const valuesClause = batch.map((o, ri) => {
      const params = [];
      params.push(`$${ri * 8 + 1}::uuid`);       // id
      params.push(`$${ri * 8 + 2}::uuid`);       // customer_id
      params.push(`$${ri * 8 + 3}::order_status`); // status
      params.push(`$${ri * 8 + 4}::decimal`);    // total_amount
      params.push(`$${ri * 8 + 5}::text`);       // city
      params.push(`$${ri * 8 + 6}::text`);       // state
      params.push(`$${ri * 8 + 7}::text`);       // country
      params.push(`$${ri * 8 + 8}::timestamp`);  // created_at
      return `(${params.join(', ')})`;
    }).join(', ');
    
    const flatValues = batch.flatMap(o => [o.id, o.customer_id, o.status, o.total_amount, o.city, o.state, o.country, o.created_at]);
    await client.query(`INSERT INTO orders (id, customer_id, status, total_amount, city, state, country, created_at) VALUES ${valuesClause}`, flatValues);
    totalOrders += batch.length;
    console.log(`  [orders] Inserted ${Math.min(i + BATCH_SIZE, allOrders.length)}/${allOrders.length} rows`);
  }
  
  // Third pass: insert order_items in batches
  for (let i = 0; i < allOrderItems.length; i += BATCH_SIZE) {
    const batch = allOrderItems.slice(i, i + BATCH_SIZE);
    if (batch.length === 0) continue;
    
    const valuesClause = batch.map((oi, ri) => {
      const params = [];
      params.push(`$${ri * 6 + 1}::uuid`);     // id
      params.push(`$${ri * 6 + 2}::uuid`);    // order_id
      params.push(`$${ri * 6 + 3}::uuid`);    // product_id
      params.push(`$${ri * 6 + 4}::int`);      // quantity
      params.push(`$${ri * 6 + 5}::decimal`);  // unit_price
      params.push(`$${ri * 6 + 6}::decimal`);  // subtotal
      return `(${params.join(', ')})`;
    }).join(', ');
    
    const flatValues = batch.flatMap(oi => [oi.id, oi.order_id, oi.product_id, oi.quantity, oi.unit_price, oi.subtotal]);
    await client.query(`INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal) VALUES ${valuesClause}`, flatValues);
    totalItems += batch.length;
    console.log(`  [order_items] Inserted ${Math.min(i + BATCH_SIZE, allOrderItems.length)}/${allOrderItems.length} rows`);
  }
  
  console.log(`Seeded ${totalOrders} orders and ${totalItems} order items`);
  
  return { orderIdToItems, orderIdToCustomerId };
}

async function seedReviews(client: Client, products: any[], customers: any[], orderIdToItems: Map<string, any[]>, orderIdToCustomerId: Map<string, string>): Promise<void> {
  console.log('Seeding reviews...');
  
  const validCustomerProducts: {customerId: string, productId: string}[] = [];
  const seenCombinations = new Set<string>();
  
  for (const [orderId, items] of orderIdToItems) {
    const customerId = orderIdToCustomerId.get(orderId);
    if (!customerId) continue;
    
    for (const item of items) {
      const key = `${customerId}-${item.product_id}`;
      if (!seenCombinations.has(key)) {
        seenCombinations.add(key);
        validCustomerProducts.push({
          customerId: customerId,
          productId: item.product_id
        });
      }
    }
  }
  
  const reviews: any[] = [];
  const reviewedProductIds = new Set<string>();
  
  for (const {customerId, productId} of validCustomerProducts) {
    if (reviewedProductIds.has(productId)) continue;
    if (Math.random() > 0.3) continue;
    
    reviewedProductIds.add(productId);
    
    reviews.push({
      id: uuidv4(),
      product_id: productId,
      customer_id: customerId,
      rating: faker.number.int({ min: 2, max: 5 }),
      comment: faker.lorem.sentence(),
      created_at: faker.date.past({ years: 1 }),
    });
  }
  
  if (reviews.length > 0) {
    await batchInsert(client, 'reviews', 'id, product_id, customer_id, rating, comment, created_at',
      reviews.map(r => [r.id, r.product_id, r.customer_id, r.rating, r.comment, r.created_at]));
  }
  console.log(`${reviews.length} reviews seeded (linked to actual orders)`);
}

async function updateCustomerStats(client: Client): Promise<void> {
  console.log('Updating customer statistics...');
  await client.query(`
    UPDATE customers c SET
      total_spend = COALESCE(sub.total, 0),
      order_count = COALESCE(sub.count, 0)
    FROM (
      SELECT customer_id, SUM(total_amount) as total, COUNT(*) as count
      FROM orders
      GROUP BY customer_id
    ) sub
    WHERE c.id = sub.customer_id
  `);
  console.log('Customer statistics updated');
}

async function seed() {
  const client = await connectWithRetry();
  const startTime = Date.now();
  
  try {
    const tablesExist = await verifyTablesExist(client);
    if (!tablesExist) {
      throw new Error('Database tables do not exist. Please run "npm run db:setup" first.');
    }
    
    await truncateTables(client);
    console.log('Tables truncated');
    
    await client.query('BEGIN');
    const customers = await seedCustomers(client);
    await client.query('COMMIT');
    console.log('Customers committed');
    
    await client.query('BEGIN');
    const categories = await seedCategories(client);
    await client.query('COMMIT');
    console.log('Categories committed');
    
    await client.query('BEGIN');
    const products = await seedProducts(client, categories);
    await client.query('COMMIT');
    console.log('Products committed');
    
    await client.query('BEGIN');
    const { orderIdToItems, orderIdToCustomerId } = await seedOrdersAndItems(client, customers, products);
    await client.query('COMMIT');
    console.log('Orders and items committed');
    
    await client.query('BEGIN');
    await seedReviews(client, products, customers, orderIdToItems, orderIdToCustomerId);
    await updateCustomerStats(client);
    await client.query('COMMIT');
    console.log('Reviews and stats committed');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nSeeding completed in ${duration}s`);
    
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM categories) as categories,
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM order_items) as order_items,
        (SELECT COUNT(*) FROM reviews) as reviews,
        (SELECT SUM(total_amount)::money FROM orders) as total_revenue
    `);
    
    console.log('\nFinal Statistics:');
    const s = stats.rows[0];
    console.log(`  Customers: ${s.customers}`);
    console.log(`  Categories: ${s.categories}`);
    console.log(`  Products: ${s.products}`);
    console.log(`  Orders: ${s.orders}`);
    console.log(`  Order Items: ${s.order_items}`);
    console.log(`  Reviews: ${s.reviews}`);
    console.log(`  Total Revenue: ${s.total_revenue}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed, rolled back:', error);
    throw error;
  } finally {
    await client.end();
  }
}

seed().catch(console.error);
