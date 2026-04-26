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
        specifications TEXT,
        make TEXT,
        uom TEXT,
        price REAL NOT NULL DEFAULT 0,
        tax_rate REAL NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS boms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        client_id INTEGER,
        date TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 0,
        parent_id INTEGER,
        total_cost REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Draft',
        FOREIGN KEY (client_id) REFERENCES clients (id)
      );

      CREATE TABLE IF NOT EXISTS bom_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bom_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        part_no TEXT,
        specifications TEXT,
        make TEXT,
        uom TEXT,
        quantity REAL NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        remark TEXT,
        FOREIGN KEY (bom_id) REFERENCES boms (id) ON DELETE CASCADE
      );
    `);
    
    // Safely add new columns to invoice_items for existing users
    const alterCommands = [
      `ALTER TABLE invoice_items ADD COLUMN part_no TEXT;`,
      `ALTER TABLE invoice_items ADD COLUMN tax_rate REAL NOT NULL DEFAULT 0;`,
      `ALTER TABLE invoice_items ADD COLUMN specifications TEXT;`,
      `ALTER TABLE invoice_items ADD COLUMN make TEXT;`,
      `ALTER TABLE invoice_items ADD COLUMN uom TEXT;`,
      `ALTER TABLE inventory ADD COLUMN specifications TEXT;`,
      `ALTER TABLE inventory ADD COLUMN make TEXT;`,
      `ALTER TABLE inventory ADD COLUMN uom TEXT;`,
      `ALTER TABLE boms ADD COLUMN global_tax_rate REAL NOT NULL DEFAULT 0;`,
      `ALTER TABLE boms ADD COLUMN global_tax_amount REAL NOT NULL DEFAULT 0;`,
      `ALTER TABLE bom_items ADD COLUMN tax_rate REAL NOT NULL DEFAULT 0;`,
    ];

    for (const cmd of alterCommands) {
      try {
        await expoDb.execAsync(cmd);
      } catch (e) { /* Ignore if column exists */ }
    }
    
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

    // Seed inventory with solar project materials if empty
    const invCount = await db.select().from(schema.inventory).limit(1);
    if (invCount.length === 0) {
      const solarMaterials = [
        { name: 'Solar PV Module', uom: 'MWp', price: 0, specifications: 'Ongrid Solar PV Modules', taxRate: 12 },
        { name: 'String Inverter', make: 'Wattpower/Sungrow', specifications: '275 kW AC at 50 deg C', uom: 'Nos', taxRate: 12 },
        { name: 'MMS Structure with Civil Foundation', specifications: '2 panel (2p) Fixed Tilt : Hot Dip Galvanized', uom: 'MWp', taxRate: 18 },
        { name: 'LT Panel', specifications: 'Outdoor IP 65, Fabricated from CRCA Switchgears', uom: 'Nos', taxRate: 18 },
        { name: 'HT Panel/VCB', specifications: '11 KV VCB, Outdoor IP 65', uom: 'Nos', taxRate: 18 },
        { name: 'Inverter duty transformer', make: 'ABC/Royal/Powertech', specifications: 'Oil Cooled ONAN Inverter Duty', uom: 'Nos', taxRate: 18 },
        { name: 'Auxilliary Transformer', specifications: '3 Phase, RATING: 25 KVA, Vector: DYN11', uom: 'Nos', taxRate: 18 },
        { name: 'UPS', make: 'LUMINOUS', specifications: '1PH 5KVA UPS with batteries', uom: 'Nos', taxRate: 18 },
        { name: 'SCADA Monitoring System', make: 'HKRP/SURYALOG', uom: 'Nos', taxRate: 18 },
        { name: 'Weather Station', specifications: 'WMS logger, Pyranometer, Sensors', uom: 'Set', taxRate: 18 },
        { name: 'AC Cables', make: 'Polycab/Apar/Avocab', uom: 'Mtrs', taxRate: 18 },
        { name: 'DC Cables', make: 'Polycab/Apar/Avocab', uom: 'Mtrs', taxRate: 18 },
        { name: 'Multi Contact Connector', make: 'Staubli/Elcom', uom: 'Nos', taxRate: 18 },
        { name: 'Earthing Cable, Strip & Accessories', uom: 'Set', taxRate: 18 },
        { name: 'Lugs and Accessories', make: 'DOWELLS', uom: 'Set', taxRate: 18 },
        { name: 'Lightning Arrester', make: 'SABO/JEF', uom: 'Nos', taxRate: 18 },
        { name: 'Cable Lying Pipe', uom: 'Mtrs', taxRate: 18 },
        { name: 'Cable Tray', uom: 'Mtrs', taxRate: 18 },
        { name: 'Communication Cable', uom: 'Mtrs', taxRate: 18 },
        { name: 'Miscellanius item', uom: 'Set', taxRate: 18 },
        { name: 'Fire Protection Equipment\'s', uom: 'Set', taxRate: 18 },
        { name: 'Main Control Room', uom: 'Nos', taxRate: 18 },
        { name: '33 KV Switch Yard', uom: 'Set', taxRate: 18 },
        { name: 'Module Cleaning System', uom: 'Set', taxRate: 18 },
        { name: 'Peripheral Lighting', uom: 'Set', taxRate: 18 },
        { name: 'Borewell', uom: 'Nos', taxRate: 18 },
        { name: 'Pheripherical road', uom: 'Mtrs', taxRate: 18 },
        { name: 'Drainage', uom: 'Mtrs', taxRate: 18 },
        { name: 'Transportation', uom: 'Set', taxRate: 18 },
        { name: 'Installation & Civil Work', uom: 'MWp', taxRate: 18 },
        { name: 'Design', uom: 'Set', taxRate: 18 },
        { name: 'Topographical survey', uom: 'Set', taxRate: 18 },
        { name: 'Contour survey', uom: 'Set', taxRate: 18 },
        { name: 'Soil Test', uom: 'Set', taxRate: 18 },
        { name: 'Profit', uom: '%', price: 0, taxRate: 0 },
      ];
      await db.insert(schema.inventory).values(solarMaterials as any);
      console.log('Inventory seeded with Solar Project materials');
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

