import { getDb, queryAll, queryOne, runSql, runTransaction, saveDb } from '../server/db/database.js';
import { initializeSchema } from '../server/db/schema.js';

interface RawItem {
  category: string;
  name: string;
  description: string;
  stock: number;
  price: number;
}

const ITEMS_TO_ADD: RawItem[] = [
  { category: 'Car Charger', name: 'Car Charger - Samsung', description: 'Samsung', stock: 1, price: 800 },
  { category: 'Car Charger', name: 'Car Charger - Original 3.1', description: 'Original 3.1', stock: 1, price: 300 },
  { category: 'OTG', name: 'OTG - Type C', description: 'Type C', stock: 3, price: 50 },
  { category: 'OTG', name: 'OTG - Type B', description: 'Type B', stock: 12, price: 50 },
  { category: 'OTG', name: 'OTG - Connect Kit Type C', description: 'Connect Kit Type C', stock: 3, price: 100 },
  { category: 'OTG', name: 'OTG - 2 in 1', description: '2 in 1', stock: 1, price: 150 },
  { category: 'OTG', name: 'OTG - Card Reader', description: 'Card Reader', stock: 17, price: 50 },
  { category: 'Flash Drive', name: 'Flash Drive - 2 GB', description: '2 GB', stock: 1, price: 450 },
  { category: 'Flash Drive', name: 'Flash Drive - 4 GB', description: '4 GB', stock: 1, price: 550 },
  { category: 'Flash Drive', name: 'Flash Drive - 8 GB', description: '8 GB', stock: 1, price: 650 },
  { category: 'Flash Drive', name: 'Flash Drive - 16 GB', description: '16 GB', stock: 1, price: 750 },
  { category: 'Memory Card', name: 'Memory Card - 8 GB', description: '8 GB', stock: 2, price: 600 },
  { category: 'SIM Ejector', name: 'SIM Ejector', description: 'SIM Ejector', stock: 9, price: 20 },
  { category: 'Battery', name: 'Battery - Techno copy', description: 'Techno copy', stock: 1, price: 150 },
  { category: 'Battery', name: 'Battery - Universal', description: 'Unclear/crossed out', stock: 2, price: 450 },
  { category: 'Phones', name: 'Phones - Rapno R87', description: 'Rapno R87', stock: 1, price: 1100 },
  { category: 'Phones', name: 'Phones - Momofy M312E', description: 'Momofy M312E', stock: 1, price: 1000 },
  { category: 'Phones', name: 'Phones - Cherish A3061', description: 'Cherish A3061', stock: 1, price: 1200 },
  { category: 'Phones', name: 'Phones - Flip E1190', description: 'Flip E1190', stock: 1, price: 1600 },
  { category: 'Phones', name: 'Phones - Bontel Explorer 100', description: 'Bontel Explorer 100', stock: 1, price: 1500 },
  { category: 'Phones', name: 'Phones - Itel 2165', description: 'Itel 2165', stock: 1, price: 1600 },
  { category: 'Phones', name: 'Phones - Nokia 105', description: 'Nokia 105', stock: 1, price: 1700 },
  { category: 'Photo Frame', name: 'Photo Frame', description: 'Photo frame', stock: 5, price: 750 },
  { category: 'Power Bank', name: 'Power Bank - Oraimo Original 10,000 mAh', description: 'Oraimo Original 10,000 mAh', stock: 1, price: 3000 },
  { category: 'Power Bank', name: 'Power Bank - Oraimo 5,000 mAh', description: 'Oraimo 5,000 mAh', stock: 1, price: 500 },
  { category: 'Power Bank', name: 'Power Bank - Amaya 10,000 mAh', description: 'Amaya 10,000 mAh', stock: 1, price: 2500 },
  { category: 'Mouse', name: 'Mouse - Wireless Mouse B', description: 'Wireless Mouse B', stock: 1, price: 850 },
  { category: 'Smart Watch', name: 'Smart Watch - W008', description: 'W008', stock: 1, price: 2000 },
  { category: 'Charger Type B', name: 'Charger Type B - Amaya 3.1A (Qty 4)', description: 'Amaya 3.1A', stock: 4, price: 350 },
  { category: 'Charger Type B', name: 'Charger Type B - Techno', description: 'Techno', stock: 1, price: 250 },
  { category: 'Charger Type B', name: 'Charger Type B - ABJ 3.1A', description: 'ABJ 3.1A', stock: 4, price: 250 },
  { category: 'Charger Type B', name: 'Charger Type B - ABJ 45 watts', description: 'ABJ 45 watts', stock: 2, price: 300 },
  { category: 'Charger Type B', name: 'Charger Type B - Support Fast Charger', description: 'Support Fast Charger', stock: 2, price: 250 },
  { category: 'Charger Type B', name: 'Charger Type B - Hoyan 3.1A', description: 'Hoyan 3.1A', stock: 5, price: 500 },
  { category: 'Charger Type B', name: 'Charger Type B - 3G Power', description: '3G Power', stock: 3, price: 100 },
  { category: 'Charger Type B', name: 'Charger Type B - Amaya 2.4A', description: 'Amaya 24? Amp', stock: 11, price: 250 },
  { category: 'Charger Type B', name: 'Charger Type B - Amaya 3.1A (Qty 2)', description: 'Amaya 3.1A', stock: 2, price: 350 },
  { category: 'Charger Type B', name: 'Charger Type B - Itel 5 watts', description: 'Itel 5 watts', stock: 4, price: 500 },
  { category: 'Charger Type B', name: 'Charger Type B - Oraimo 2A', description: 'Oraimo 2A', stock: 3, price: 700 },
  { category: 'Charger Type B', name: 'Charger Type B - Excellent', description: 'Excellent', stock: 2, price: 650 },
  { category: 'Earphones', name: 'Earphones - Dr Lee', description: 'Dr Lee', stock: 4, price: 100 },
  { category: 'Earphones', name: 'Earphones - Oraimo copy (Strong Base)', description: 'Oraimo copy – Strong Base', stock: 5, price: 150 },
  { category: 'Earphones', name: 'Earphones - Oraimo Trumpet', description: 'Oraimo Trumpet', stock: 2, price: 200 },
  { category: 'Earphones', name: 'Earphones - Oraimo Superior Base', description: 'Oraimo Superior Base', stock: 4, price: 350 },
  { category: 'Earphones', name: 'Earphones - Amaya', description: 'Amaya', stock: 5, price: 150 },
  { category: 'Earphones', name: 'Earphones - O-Fia', description: 'O-Fia', stock: 11, price: 200 },
  { category: 'Earphones', name: 'Earphones - Samsung', description: 'Samsung', stock: 4, price: 300 },
  { category: 'Earphones', name: 'Earphones - Necklace KS 201 – Oraimo', description: 'Necklace KS 201 – Oraimo', stock: 1, price: 700 },
  { category: 'Earphones', name: 'Earphones - Necklace Oraimo KS 102', description: 'Necklace Oraimo KS 102', stock: 1, price: 900 },
  { category: 'Earphones', name: 'Earphones - Oraimo Neckhead Set', description: 'Oraimo Neckhead Set', stock: 1, price: 1500 },
  { category: 'Earphones', name: 'Earphones - Earpods M10', description: 'Earpods M10', stock: 1, price: 1000 },
  { category: 'Earphones', name: 'Earphones - Earpods I15', description: 'Earpods I15', stock: 1, price: 800 },
  { category: 'Earphones', name: 'Earphones - Earpods I12', description: 'Earpods I12', stock: 1, price: 600 },
  { category: 'Headphones', name: 'Headphones - Plush Fluffy', description: 'Plush Fluffy', stock: 2, price: 1800 },
  { category: 'Headphones', name: 'Headphones - JBL', description: 'JBL', stock: 1, price: 1500 },
  { category: 'Headphones', name: 'Headphones - Sony', description: 'Sony', stock: 1, price: 1500 },
  { category: 'Headphones', name: 'Headphones - PHT-701', description: 'PHT-701', stock: 1, price: 800 },
  { category: 'Cables', name: 'Cables - USB Multi-charge', description: 'USB Multi-charge', stock: 2, price: 250 },
  { category: 'Cables', name: 'Cables - Normal Cable Type B', description: 'Normal Cable Type B', stock: 4, price: 100 },
  { category: 'Cables', name: 'Cables - ABJ Cable Type B', description: 'ABJ Cable Type B', stock: 2, price: 150 },
  { category: 'Cables', name: 'Cables - Oraimo Cable Type B copy', description: 'Oraimo Cable Type B copy', stock: 5, price: 150 },
  { category: 'Cables', name: 'Cables - Amaya Cable Type B', description: 'Amaya Cable Type B', stock: 6, price: 200 },
  { category: 'Cables', name: 'Cables - Oraimo Original Type B', description: 'Oraimo Original Type B', stock: 4, price: 200 },
  { category: 'Cables', name: 'Cables - Amaya Type C copy', description: 'Amaya Type C copy', stock: 7, price: 150 },
  { category: 'Cables', name: 'Cables - Amaya Original Type C', description: 'Amaya Original Type C', stock: 5, price: 250 },
  { category: 'Cables', name: 'Cables - Oraimo copy Type C', description: 'Oraimo copy Type C', stock: 3, price: 150 },
  { category: 'Cables', name: 'Cables - Oraimo Original Type C', description: 'Oraimo Original Type C', stock: 4, price: 250 },
  { category: 'Cables', name: 'Cables - Oraimo Ultra Type C', description: 'Oraimo Ultra Type C', stock: 2, price: 350 },
  { category: 'Cables', name: 'Cables - Punex Type C', description: 'Punex Type C', stock: 3, price: 250 },
  { category: 'Cables', name: 'Cables - Punex Type B', description: 'Punex Type B', stock: 2, price: 250 },
  { category: 'Cables', name: 'Cables - Punex iPhone', description: 'Punex iPhone', stock: 2, price: 250 },
  { category: 'Cables', name: 'Cables - Excellent Type B', description: 'Excellent Type B', stock: 2, price: 250 },
  { category: 'Cables', name: 'Cables - Reamep Type C', description: 'Reamep Type C', stock: 3, price: 200 },
  { category: 'Cables', name: 'Cables - Samsung C to C', description: 'Samsung C to C', stock: 3, price: 450 },
  { category: 'Charger Type C', name: 'Charger Type C - Amaya 2A', description: 'Amaya 2A', stock: 1, price: 450 },
  { category: 'Charger Type C', name: 'Charger Type C - Amaya 3.1A', description: 'Amaya 3.1A', stock: 2, price: 450 },
  { category: 'Charger Type C', name: 'Charger Type C - Aldeepro 3.1A', description: 'Aldeepro 3.1A', stock: 1, price: 400 },
  { category: 'Charger Type C', name: 'Charger Type C - Aldeepro 30 watts', description: 'Aldeepro 30 watts', stock: 3, price: 900 },
  { category: 'Charger Type C', name: 'Charger Type C - Excellent', description: 'Excellent', stock: 4, price: 800 },
  { category: 'Charger Type C', name: 'Charger Type C - Oraimo 2A', description: 'Oraimo 2A', stock: 1, price: 800 },
  { category: 'Charger Type C', name: 'Charger Type C - Samsung 25 watts, C to C', description: 'Samsung 25 watts, C to C', stock: 2, price: 1200 },
  { category: 'Charger Type C', name: 'Charger Type C - Samsung 35 watts, C to C', description: 'Samsung 35 watts, C to C', stock: 1, price: 1300 },
  { category: 'Adapter', name: 'Adapter - Hoyan copy', description: 'Hoyan copy', stock: 4, price: 200 },
  { category: 'Adapter', name: 'Adapter - Original', description: 'Original', stock: 0, price: 200 },
  { category: 'Adapter', name: 'Adapter - Hyper 120 watts', description: 'Hyper 120 watts', stock: 2, price: 500 },
  { category: 'Adapter', name: 'Adapter - Hoyan Original', description: 'Hoyan Original', stock: 1, price: 450 },
  { category: 'Adapter', name: 'Adapter - Travel Adapter 4 ports', description: 'Travel Adapter 4 ports', stock: 2, price: 450 },
  { category: 'Adapter', name: 'Adapter - Samsung C port 25W', description: 'Samsung C port 25W', stock: 1, price: 700 },
  { category: 'Adapter', name: 'Adapter - Samsung C port 45W', description: 'Samsung C port 45W', stock: 1, price: 900 },
];

async function main() {
  console.log('Connecting to database...');
  await getDb();
  await initializeSchema();

  const now = new Date().toISOString();
  console.log(`Starting insertion of ${ITEMS_TO_ADD.length} physical products...`);

  runTransaction(() => {
    let inserted = 0;
    let updated = 0;
    let index = 500;

    for (const item of ITEMS_TO_ADD) {
      index++;
      // 1. Ensure category exists
      let cat = queryOne<{ id: number }>('SELECT id FROM categories WHERE name = ? COLLATE NOCASE', [item.category]);
      let catId: number;

      if (!cat) {
        const catRes = runSql(
          `INSERT INTO categories (name, type, active, created_at, updated_at) VALUES (?, 'product', 1, ?, ?)`,
          [item.category, now, now]
        );
        catId = catRes.lastInsertRowid;
        console.log(`Created new category: "${item.category}" with ID: ${catId}`);
      } else {
        catId = cat.id;
        runSql('UPDATE categories SET type = "product", active = 1, updated_at = ? WHERE id = ?', [now, catId]);
      }

      // 2. Check if product already exists by exact name or matching description in category
      const existing = queryOne<{ id: number; name: string }>(
        'SELECT id, name FROM products WHERE name = ? OR (description = ? AND category_id = ?)',
        [item.name, item.description, catId]
      );

      const estimatedCost = Math.round(item.price * 0.7);

      if (existing) {
        runSql(
          `UPDATE products SET
            selling_price = ?,
            stock_quantity = ?,
            category_id = ?,
            description = ?,
            cost_price = ?,
            active = 1,
            updated_at = ?
          WHERE id = ?`,
          [item.price, item.stock, catId, item.description, estimatedCost, now, existing.id]
        );
        updated++;
      } else {
        const cleanCat = item.category.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'ACC';
        const cleanDesc = item.description.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'ITM';
        const sku = `PRD-${cleanCat}-${cleanDesc}-${index}`;

        const pRes = runSql(
          `INSERT INTO products (
            sku, barcode, name, description, category_id, cost_price, selling_price,
            stock_quantity, minimum_stock, unit, supplier, active, created_at, updated_at
          ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 5, 'piece', 'Electronics Supply & Wholesale', 1, ?, ?)`,
          [sku, item.name, item.description, catId, estimatedCost, item.price, item.stock, now, now]
        );

        const newId = pRes.lastInsertRowid;
        if (item.stock > 0) {
          runSql(
            `INSERT INTO inventory_movements (
              product_id, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, created_at
            ) VALUES (?, 'restock', ?, 0, ?, 'Stock initialization for ' || ?, 1, ?)`,
            [newId, item.stock, item.stock, item.name, now]
          );
        }
        inserted++;
      }
    }

    console.log(`Transaction complete: ${inserted} items inserted, ${updated} items updated.`);
  });

  saveDb();

  const totalProducts = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products');
  const allCategories = queryAll<{ id: number; name: string; count: number }>(`
    SELECT c.id, c.name, COUNT(p.id) as count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id, c.name
    ORDER BY c.name ASC
  `);

  console.log(`\n========================================`);
  console.log(`TOTAL PRODUCTS IN DATABASE NOW: ${totalProducts?.count || 0}`);
  console.log(`========================================`);
  console.log('Categories breakdown:');
  for (const cat of allCategories) {
    if (cat.count > 0) {
      console.log(` - ${cat.name}: ${cat.count} products`);
    }
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
