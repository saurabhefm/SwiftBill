import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as schema from './schema';

let expoDb: SQLiteDatabase | null = null;
let _db: any = null;

export const getDb = () => _db;

const PRELOADED_INVENTORY = [
  { name: 'Solar Module 550Wp Mono Perc', make: 'Adani', price: 11500, taxRate: 12, uom: 'Nos' },
  { name: 'Solar Module 540Wp Mono Perc', make: 'Waaree', price: 11200, taxRate: 12, uom: 'Nos' },
  { name: 'Solar Module 535Wp Bi-Facial', make: 'Tata Power', price: 12500, taxRate: 12, uom: 'Nos' },
  { name: 'On-Grid Inverter 50KW', make: 'Sungrow', price: 95000, taxRate: 12, uom: 'Nos' },
  { name: 'ACDB with SPD & MCB 50KW', make: 'Solveig', price: 14500, taxRate: 18, uom: 'Nos' },
  { name: 'DCDB with 4 String SPD', make: 'Solveig', price: 9500, taxRate: 18, uom: 'Nos' },
  { name: 'DC Cable 4sqmm Red', make: 'Polycab', price: 68, taxRate: 18, uom: 'Mtrs' },
  { name: 'DC Cable 4sqmm Black', make: 'Polycab', price: 68, taxRate: 18, uom: 'Mtrs' },
];

export const initDb = async (onProgress?: (status: string, progress: number) => void) => {
  console.log('[DB] Starting Initialization...');
  
  try {
    if (!expoDb) {
      console.log('[DB] Opening Connection...');
      expoDb = await openDatabaseAsync('swiftbill.db');
      _db = drizzle(expoDb, { schema });
    }

    console.log('[DB] Running Foundation Sync...');
    
    // HARD RESET: Drop old tables if they are using CamelCase names
    const checkBoms = await expoDb.getAllAsync("PRAGMA table_info(boms)");
    const hasOldName = checkBoms.some((col: any) => col.name === 'projectName');
    
    if (hasOldName) {
      console.log('[DB] Found old BOM table, dropping...');
      await expoDb.execAsync('DROP TABLE IF EXISTS bom_items;');
      await expoDb.execAsync('DROP TABLE IF EXISTS boms;');
    }

    await expoDb.execAsync('CREATE TABLE IF NOT EXISTS business_profile (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT, phone TEXT, email TEXT, bank_name TEXT, bank_account TEXT, logo_uri TEXT, currency TEXT DEFAULT "₹", invoice_prefix TEXT DEFAULT "INV");');
    await expoDb.execAsync('CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT);');
    await expoDb.execAsync('CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, part_no TEXT, specifications TEXT, make TEXT, uom TEXT, price REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0);');
    // FIXED: Using double quotes for the SQL string to allow single quotes inside
    await expoDb.execAsync("CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_number TEXT NOT NULL UNIQUE, date TEXT NOT NULL, due_date TEXT, status TEXT NOT NULL DEFAULT 'Draft', client_id INTEGER, subtotal REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0, tax_amount REAL NOT NULL DEFAULT 0, discount_rate REAL NOT NULL DEFAULT 0, discount_amount REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, notes TEXT, FOREIGN KEY (client_id) REFERENCES clients (id));");
    await expoDb.execAsync('CREATE TABLE IF NOT EXISTS invoice_items (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL, description TEXT NOT NULL, part_no TEXT, specifications TEXT, make TEXT, uom TEXT, quantity REAL NOT NULL DEFAULT 0, unit_price REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE);');
    await expoDb.execAsync("CREATE TABLE IF NOT EXISTS boms (id INTEGER PRIMARY KEY AUTOINCREMENT, project_name TEXT NOT NULL, client_id INTEGER, date TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, parent_id INTEGER, global_tax_rate REAL NOT NULL DEFAULT 0, global_tax_amount REAL NOT NULL DEFAULT 0, project_capacity REAL NOT NULL DEFAULT 30, profit_rate REAL NOT NULL DEFAULT 0, total_cost REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'Draft', notes TEXT, FOREIGN KEY (client_id) REFERENCES clients (id));");
    await expoDb.execAsync('CREATE TABLE IF NOT EXISTS bom_items (id INTEGER PRIMARY KEY AUTOINCREMENT, bom_id INTEGER NOT NULL, description TEXT NOT NULL, part_no TEXT, specifications TEXT, make TEXT, uom TEXT, quantity REAL NOT NULL DEFAULT 1, unit_price REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, remark TEXT, FOREIGN KEY (bom_id) REFERENCES boms (id) ON DELETE CASCADE);');

    // Migrations for Invoice Items
    try {
      await expoDb.execAsync('ALTER TABLE invoice_items ADD COLUMN specifications TEXT;');
      await expoDb.execAsync('ALTER TABLE invoice_items ADD COLUMN make TEXT;');
      await expoDb.execAsync('ALTER TABLE invoice_items ADD COLUMN uom TEXT;');
    } catch (e) {}

    console.log('[DB] Checking Seed Data...');
    const invCount = await expoDb.getAllAsync("SELECT id FROM inventory LIMIT 1");
    if (invCount.length === 0) {
      console.log('[DB] Seeding Data...');
      for (const item of PRELOADED_INVENTORY) {
        await expoDb.runAsync('INSERT INTO inventory (name, make, price, tax_rate, uom) VALUES (?, ?, ?, ?, ?)', 
          [item.name, item.make, item.price, item.taxRate, item.uom]);
      }
    }

    console.log('[DB] Initialization Complete.');
    if (onProgress) onProgress('Ready', 100);
    return _db;
  } catch (error) {
    console.error('[DB] CRITICAL ERROR during init:', error);
    return _db;
  }
};
