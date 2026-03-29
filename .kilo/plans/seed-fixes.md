# Plan: seed.ts Fixes

## Status: Ready for Implementation

## Issues to Fix

### Issue 1: Compute Order Totals During Generation ✅ ALREADY FIXED (BATCH_SIZE = 500)
- Current: BATCH_SIZE = 500 at line 5
- Result: Performance issue resolved

### Issue 2: Compute Order Totals During Generation (NOT After)
**Current** (lines 227-236, 289-300):
```typescript
// Insert with 0, compute after
ordersBatch.push({ total_amount: 0, ... })
// Later...
await client.query(`UPDATE orders o SET total_amount = sub.total FROM (...) sub`)
```

**Fix**: Compute total during order creation loop
```typescript
let orderTotal = 0;
// Inside order loop, accumulate item totals
orderTotal += subtotal;
// Push with computed total
ordersBatch.push({ total_amount: orderTotal, ... })
```

**Files**: `scripts/seed.ts` lines 197-301

---

### Issue 3: Product Popularity Skew
**Current** (line 241):
```typescript
const product = products[Math.floor(Math.random() * products.length)];
```

**Fix**: Add popularity subset
```typescript
const popularProducts = products.slice(0, 50); // Top 50 products
const product = Math.random() < 0.7
  ? popularProducts[Math.floor(Math.random() * popularProducts.length)]
  : products[Math.floor(Math.random() * products.length)];
```

**Files**: `scripts/seed.ts` lines 197-301

---

### Issue 4: Link Reviews to Orders
**Current** (lines 303-333):
```typescript
// Random customer + random product
const customer = customers[Math.floor(Math.random() * customers.length)];
const product = products[Math.floor(Math.random() * products.length)];
```

**Fix**: Query existing order_items to get valid customer-product pairs
```typescript
// After orders are seeded, get actual purchases
const validPurchases = await client.query(`
  SELECT DISTINCT ON (oi.product_id, oi.customer_id)
    oi.product_id, oi.customer_id
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.status != 'cancelled'
`);

// Link reviews to these valid purchases
```

**Files**: `scripts/seed.ts` lines 303-333

---

## Implementation Order

1. **seedOrdersAndItems** function (lines 197-301):
   - Add `popularProducts` array parameter
   - Modify product selection to use skew
   - Compute `orderTotal` during loop

2. **seedReviews** function (lines 303-333):
   - Add parameter for order_items data
   - Query valid purchases first
   - Use valid pairs for reviews

3. **seed** main function (lines 351-422):
   - Pass products array to seedOrdersAndItems
   - Query order_items after orders seeded
   - Pass valid purchases to seedReviews

---

## Changes Summary

| Issue | Location | Change |
|-------|----------|--------|
| Order totals | seedOrdersAndItems | Compute during loop |
| Product skew | seedOrdersAndItems | Add popularity bias |
| Reviews | seedReviews | Link to order_items |