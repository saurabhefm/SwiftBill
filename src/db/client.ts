import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as schema from './schema';

let _db: any = null;
let expoDb: SQLiteDatabase | null = null;

export const getDb = () => _db;

export const initDb = async (onProgress?: (status: string) => void) => {
  try {
    if (!expoDb) {
      expoDb = await openDatabaseAsync('swiftbill.db');
      _db = drizzle(expoDb, { schema });
    }

    if (onProgress) onProgress('Setting up tables...');
    
    await expoDb.execAsync("CREATE TABLE IF NOT EXISTS business_profile (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT, phone TEXT, email TEXT, bank_name TEXT, bank_account TEXT, logo_uri TEXT, currency TEXT DEFAULT '₹', invoice_prefix TEXT DEFAULT 'INV');");
    await expoDb.execAsync("CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT);");
    await expoDb.execAsync("CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, part_no TEXT, specifications TEXT, make TEXT, uom TEXT, price REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0);");
    await expoDb.execAsync("CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_number TEXT NOT NULL UNIQUE, date TEXT NOT NULL, due_date TEXT, status TEXT NOT NULL DEFAULT 'Draft', client_id INTEGER, subtotal REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0, tax_amount REAL NOT NULL DEFAULT 0, discount_rate REAL NOT NULL DEFAULT 0, discount_amount REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, notes TEXT, FOREIGN KEY (client_id) REFERENCES clients (id));");
    await expoDb.execAsync("CREATE TABLE IF NOT EXISTS invoice_items (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL, description TEXT NOT NULL, part_no TEXT, specifications TEXT, make TEXT, uom TEXT, quantity REAL NOT NULL DEFAULT 0, unit_price REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE);");
    
    // Check for old CamelCase column
    const tableInfo: any = await expoDb.getAllAsync("PRAGMA table_info(boms)");
    const hasOldColumn = tableInfo.some((col: any) => col.name === 'projectName');
    
    if (hasOldColumn) {
      if (onProgress) onProgress('Migrating BOM table...');
      await expoDb.execAsync("DROP TABLE IF EXISTS boms;");
      await expoDb.execAsync("DROP TABLE IF EXISTS bom_items;");
    }

    await expoDb.execAsync("CREATE TABLE IF NOT EXISTS boms (id INTEGER PRIMARY KEY AUTOINCREMENT, project_name TEXT NOT NULL, client_id INTEGER, date TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, parent_id INTEGER, global_tax_rate REAL NOT NULL DEFAULT 0, global_tax_amount REAL NOT NULL DEFAULT 0, project_capacity REAL NOT NULL DEFAULT 30, profit_rate REAL NOT NULL DEFAULT 0, contingency_rate REAL NOT NULL DEFAULT 0, total_cost REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'Draft', notes TEXT, FOREIGN KEY (client_id) REFERENCES clients (id));");
    await expoDb.execAsync("CREATE TABLE IF NOT EXISTS bom_items (id INTEGER PRIMARY KEY AUTOINCREMENT, bom_id INTEGER NOT NULL, description TEXT NOT NULL, part_no TEXT, specifications TEXT, make TEXT, uom TEXT, quantity REAL NOT NULL DEFAULT 1, unit_price REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0, is_tax_enabled INTEGER NOT NULL DEFAULT 1, total REAL NOT NULL DEFAULT 0, remark TEXT, FOREIGN KEY (bom_id) REFERENCES boms (id) ON DELETE CASCADE);");

    // Columns
    try { await expoDb.execAsync("ALTER TABLE invoice_items ADD COLUMN specifications TEXT;"); } catch(e) {}
    try { await expoDb.execAsync("ALTER TABLE invoice_items ADD COLUMN make TEXT;"); } catch(e) {}
    try { await expoDb.execAsync("ALTER TABLE invoice_items ADD COLUMN uom TEXT;"); } catch(e) {}
    try { await expoDb.execAsync("ALTER TABLE bom_items ADD COLUMN is_tax_enabled INTEGER NOT NULL DEFAULT 1;"); } catch(e) {}
    try { await expoDb.execAsync("ALTER TABLE boms ADD COLUMN contingency_rate REAL NOT NULL DEFAULT 0;"); } catch(e) {}

    if (onProgress) onProgress('Ready!');
    return _db;
  } catch (error) {
    console.error('[DB] Initialization Error:', error);
    return _db;
  }
};
