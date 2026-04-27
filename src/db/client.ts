import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as schema from './schema';

let expoDb: SQLiteDatabase | null = null;
let _db: any = null;

export const getDb = () => _db;

const PRELOADED_INVENTORY = [
  // 1-10: Panels & Inverters
  { name: 'Solar Module 550Wp Mono Perc', make: 'Adani', price: 11500, taxRate: 12, uom: 'Nos' },
  { name: 'Solar Module 540Wp Mono Perc', make: 'Waaree', price: 11200, taxRate: 12, uom: 'Nos' },
  { name: 'Solar Module 535Wp Bi-Facial', make: 'Tata Power', price: 12500, taxRate: 12, uom: 'Nos' },
  { name: 'On-Grid Inverter 50KW', make: 'Sungrow', price: 95000, taxRate: 12, uom: 'Nos' },
  { name: 'On-Grid Inverter 20KW', make: 'Solis', price: 45000, taxRate: 12, uom: 'Nos' },
  { name: 'On-Grid Inverter 100KW', make: 'ABB', price: 185000, taxRate: 12, uom: 'Nos' },
  { name: 'Hybrid Inverter 10KW', make: 'Goodwe', price: 110000, taxRate: 12, uom: 'Nos' },
  { name: 'Micro Inverter 1200W', make: 'Enphase', price: 18000, taxRate: 12, uom: 'Nos' },
  { name: 'Solar Module 400Wp Poly', make: 'Vikram', price: 8500, taxRate: 12, uom: 'Nos' },
  { name: 'Solar Module 335Wp Poly', make: 'Loom', price: 7200, taxRate: 12, uom: 'Nos' },

  // 11-20: Balance of System (BOS)
  { name: 'ACDB with SPD & MCB 50KW', make: 'Solveig', price: 14500, taxRate: 18, uom: 'Nos' },
  { name: 'DCDB with 4 String SPD', make: 'Solveig', price: 9500, taxRate: 18, uom: 'Nos' },
  { name: 'DC Cable 4sqmm Red', make: 'Polycab', price: 68, taxRate: 18, uom: 'Mtrs' },
  { name: 'DC Cable 4sqmm Black', make: 'Polycab', price: 68, taxRate: 18, uom: 'Mtrs' },
  { name: 'AC Cable 3.5C 35sqmm Al', make: 'Havells', price: 310, taxRate: 18, uom: 'Mtrs' },
  { name: 'AC Cable 4C 16sqmm Cu', make: 'Havells', price: 450, taxRate: 18, uom: 'Mtrs' },
  { name: 'Earthing Rod Chemical 2Mtr', make: 'Local', price: 2100, taxRate: 18, uom: 'Nos' },
  { name: 'Lightning Arrester ESE', make: 'LPI', price: 18500, taxRate: 18, uom: 'Nos' },
  { name: 'GI Earthing Strip 25x3mm', make: 'Local', price: 125, taxRate: 18, uom: 'Mtrs' },
  { name: 'PVC Conduit 32mm Heavy', make: 'Precision', price: 55, taxRate: 18, uom: 'Mtrs' },

  // 21-35: Structure & Misc
  { name: 'Hot Dip GI Structure Rail', make: 'Local', price: 480, taxRate: 18, uom: 'Mtrs' },
  { name: 'Mid Clamp with SS Bolt', make: 'Local', price: 28, taxRate: 18, uom: 'Nos' },
  { name: 'End Clamp with SS Bolt', make: 'Local', price: 32, taxRate: 18, uom: 'Nos' },
  { name: 'MC4 Connectors Pair', make: 'Staubli', price: 145, taxRate: 18, uom: 'Pairs' },
  { name: 'Datalogger WiFi Stick', make: 'Inverter Brand', price: 8500, taxRate: 18, uom: 'Nos' },
  { name: 'Net Metering Bidirectional', make: 'Secure', price: 14500, taxRate: 18, uom: 'Nos' },
  { name: 'Walkway GI Perforated', make: 'Local', price: 920, taxRate: 18, uom: 'Mtrs' },
  { name: 'Cable Tray GI 150mm', make: 'Local', price: 380, taxRate: 18, uom: 'Mtrs' },
  { name: 'Copper Earthing Wire 10sqmm', make: 'Local', price: 140, taxRate: 18, uom: 'Mtrs' },
  { name: 'Fire Extinguisher ABC 4KG', make: 'Local', price: 2500, taxRate: 18, uom: 'Nos' },
  { name: 'Danger Plate Solar', make: 'Local', price: 150, taxRate: 18, uom: 'Nos' },
  { name: 'Solar Warning Stickers Set', make: 'Local', price: 450, taxRate: 18, uom: 'Set' },
  { name: 'ACDB for 10KW Single Phase', make: 'Local', price: 6500, taxRate: 18, uom: 'Nos' },
  { name: 'UPS 1KVA for Monitoring', make: 'Luminous', price: 5500, taxRate: 18, uom: 'Nos' },
  { name: 'Solar Street Light 30W', make: 'Local', price: 4500, taxRate: 12, uom: 'Nos' },
];

export const initDb = async (onProgress?: (status: string, progress: number) => void) => {
  try {
    if (!expoDb) {
      if (onProgress) onProgress('Connecting...', 10);
      expoDb = await openDatabaseAsync('swiftbill.db');
      _db = drizzle(expoDb, { schema });
    }

    if (onProgress) onProgress('Syncing Tables...', 30);
    await expoDb.execAsync(`
      CREATE TABLE IF NOT EXISTS business_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, address TEXT, phone TEXT, email TEXT,
        bank_name TEXT, bank_account TEXT, logo_uri TEXT,
        currency TEXT DEFAULT '₹', invoice_prefix TEXT DEFAULT 'INV'
      );
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, email TEXT, phone TEXT, address TEXT
      );
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, part_no TEXT, specifications TEXT,
        make TEXT, uom TEXT, price REAL NOT NULL DEFAULT 0,
        tax_rate REAL NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL UNIQUE, date TEXT NOT NULL,
        due_date TEXT, status TEXT NOT NULL DEFAULT 'Draft',
        client_id INTEGER, subtotal REAL NOT NULL DEFAULT 0,
        tax_rate REAL NOT NULL DEFAULT 0, tax_amount REAL NOT NULL DEFAULT 0,
        discount_rate REAL NOT NULL DEFAULT 0, discount_amount REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0, notes TEXT,
        FOREIGN KEY (client_id) REFERENCES clients (id)
      );
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL, description TEXT NOT NULL,
        part_no TEXT, quantity REAL NOT NULL DEFAULT 0,
        unit_price REAL NOT NULL DEFAULT 0, tax_rate REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS boms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL, client_id INTEGER, date TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 0, parent_id INTEGER,
        global_tax_rate REAL NOT NULL DEFAULT 0, global_tax_amount REAL NOT NULL DEFAULT 0,
        project_capacity REAL NOT NULL DEFAULT 30, profit_rate REAL NOT NULL DEFAULT 0,
        total_cost REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'Draft',
        notes TEXT, FOREIGN KEY (client_id) REFERENCES clients (id)
      );
      CREATE TABLE IF NOT EXISTS bom_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bom_id INTEGER NOT NULL, description TEXT NOT NULL,
        part_no TEXT, specifications TEXT, make TEXT, uom TEXT,
        quantity REAL NOT NULL DEFAULT 1, unit_price REAL NOT NULL DEFAULT 0,
        tax_rate REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0,
        remark TEXT, FOREIGN KEY (bom_id) REFERENCES boms (id) ON DELETE CASCADE
      );
    `);

    if (onProgress) onProgress('Checking Inventory...', 60);
    const invCount = await _db.select().from(schema.inventory).limit(1);
    if (invCount.length === 0) {
      if (onProgress) onProgress('Seeding 35+ Items...', 80);
      for (const item of PRELOADED_INVENTORY) {
        await _db.insert(schema.inventory).values(item);
      }
    }

    if (onProgress) onProgress('Checking Profile...', 90);
    const profile = await _db.select().from(schema.businessProfile).limit(1);
    if (profile.length === 0) {
      await _db.insert(schema.businessProfile).values({ name: 'SwiftBill User' });
    }

    if (onProgress) onProgress('Welcome!', 100);
    return _db;
  } catch (error: any) {
    console.error('DB Init Error:', error);
    return _db;
  }
};
