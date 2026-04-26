import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const expoDb = openDatabaseSync('swiftbill.db');

export const db = drizzle(expoDb, { schema });

export const initDb = async () => {
  // In a real app, you might use drizzle-kit migrations.
  // For simplicity and speed in this local-first app, we'll ensure tables exist.
  // Note: drizzle-orm/expo-sqlite/migrator exists but requires extra setup.
  
  // We'll run raw SQL to ensure tables exist if not using migrations.
  // However, Drizzle provides a way to push changes.
  // For now, let's assume the user wants a robust setup.
  
  try {
    // Basic table creation if not exists
    await expoDb.execAsync(`
      CREATE TABLE IF NOT EXISTS business_profile (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        bank_name TEXT,
        bank_account TEXT,
        logo_uri TEXT,
        currency TEXT DEFAULT '₹',
        invoice_prefix TEXT DEFAULT 'INV'
      );
      
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT
      );
      
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL UNIQUE,
        date TEXT NOT NULL,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'Draft',
        client_id INTEGER,
        subtotal REAL NOT NULL DEFAULT 0,
        tax_rate REAL NOT NULL DEFAULT 0,
        tax_amount REAL NOT NULL DEFAULT 0,
        discount_rate REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (client_id) REFERENCES clients (id)
      );
      
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        part_no TEXT,
        price REAL NOT NULL DEFAULT 0,
        tax_rate REAL NOT NULL DEFAULT 0
      );
    `);
    
    // Safely add new columns to invoice_items for existing users
    try {
      await expoDb.execAsync(`ALTER TABLE invoice_items ADD COLUMN part_no TEXT;`);
    } catch (e) { /* Ignore if exists */ }
    
    try {
      await expoDb.execAsync(`ALTER TABLE invoice_items ADD COLUMN tax_rate REAL NOT NULL DEFAULT 0;`);
    } catch (e) { /* Ignore if exists */ }

    
    // Seed initial business profile if empty
    const result = await db.query.businessProfile.findFirst();
    if (!result) {
      await db.insert(schema.businessProfile).values({
        id: 1,
        name: 'My Business',
        currency: '₹',
        invoicePrefix: 'INV',
      });
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};
