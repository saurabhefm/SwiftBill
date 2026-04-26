import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as schema from './schema';

let expoDb: SQLiteDatabase;
export let db: any;

export const initDb = async () => {
  try {
    if (!expoDb) {
      expoDb = await openDatabaseAsync('swiftbill.db');
      db = drizzle(expoDb, { schema });
    }

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
      `ALTER TABLE boms ADD COLUMN notes TEXT;`,
      `ALTER TABLE boms ADD COLUMN project_capacity REAL DEFAULT 30;`,
      `ALTER TABLE boms ADD COLUMN profit_rate REAL DEFAULT 10;`,
    ];

    for (const cmd of alterCommands) {
      try {
        await expoDb.execAsync(cmd);
      } catch (e) {
        // Expected if columns already exist
      }
    }
    
    // Seed initial business profile if empty
    try {
      const result = await db.query.businessProfile.findFirst();
      if (!result) {
        await db.insert(schema.businessProfile).values({
          id: 1,
          name: 'My Business',
          currency: '₹',
          invoicePrefix: 'INV',
        });
      }
    } catch (e) {
      console.error('Seeding profile failed', e);
    }

    try {
      const invCount = await db.select().from(schema.inventory).limit(1);
      if (invCount.length === 0) {
        const solarMaterials = [
          // Modules & Inverters
          { name: 'Solar PV Module', uom: 'MWp', specifications: 'Monofacial/Bifacial, 540Wp+', make: 'Wattpower/Adani/Waaree', taxRate: 12, price: 0 },
          { name: 'String Inverter', uom: 'Nos', specifications: '1500 VDC/800VAC, Grid-tied', make: 'Sungrow/Solis/Fimer', taxRate: 12, price: 0 },
          
          // Structure & Civil
          { name: 'MMS Structure', uom: 'MWp', specifications: 'Fixed Tilt, Hot Dip Galvanized (80-100 microns), IS 2062/800-2007', make: 'Standard', taxRate: 18, price: 0 },
          { name: 'Civil Foundation', uom: 'Nos', specifications: 'Pile Foundation/RCC, M25 Grade', taxRate: 18, price: 0 },
          { name: 'Peripheral Road', uom: 'Mtrs', specifications: 'WMM/CC Road for site access', taxRate: 18, price: 0 },
          { name: 'Drainage System', uom: 'Mtrs', specifications: 'RCC/Brick Masonry for water management', taxRate: 18, price: 0 },
          { name: 'Borewell', uom: 'Nos', specifications: '6" dia, with Submersible Pump', taxRate: 18, price: 0 },
          
          // Electrical - HT/LT
          { name: 'LT Panel', uom: 'Nos', specifications: 'Outdoor IP 65, CRCA, Modular', make: 'Standard/ABB/L&T', taxRate: 18, price: 0 },
          { name: 'HT Panel/VCB', uom: 'Nos', specifications: '11/33 KV VCB, Indoor/Outdoor', make: 'ABB/Siemens/Schneider', taxRate: 18, price: 0 },
          { name: 'Inverter Duty Transformer', uom: 'Nos', specifications: 'Oil Cooled ONAN, Copper Wound', make: 'Standard', taxRate: 18, price: 0 },
          { name: 'Auxilliary Transformer', uom: 'Nos', specifications: '25/63 KVA, 11KV/415V, DYN11', make: 'Standard', taxRate: 18, price: 0 },
          { name: 'UPS System', uom: 'Nos', specifications: '1PH/3PH 5KVA UPS with Battery Bank', make: 'Luminous/Microtek', taxRate: 18, price: 0 },
          
          // Monitoring & Instrumentation
          { name: 'SCADA System', uom: 'Nos', specifications: 'Real-time monitoring, PPC functionality', make: 'Reputed', taxRate: 18, price: 0 },
          { name: 'Weather Station', uom: 'Set', specifications: 'Irradiance, Temp, Wind speed sensors', make: 'Reputed', taxRate: 18, price: 0 },
          { name: 'ABT Metering Unit', uom: 'Set', specifications: '0.2s Accuracy Class with CTPT set', taxRate: 18, price: 0 },
          
          // Cables & Wiring
          { name: 'AC Cables (LT)', uom: 'Mtrs', specifications: 'Al XLPE, Armoured, 1.1KV', make: 'Polycab/Apar/KEI', taxRate: 18, price: 0 },
          { name: 'AC Cables (HT)', uom: 'Mtrs', specifications: 'Al XLPE, Armoured, 11/33KV', make: 'Polycab/Apar/KEI', taxRate: 18, price: 0 },
          { name: 'DC Cables', uom: 'Mtrs', specifications: 'Cu, XLPO, 1.5KV, UV Protected', make: 'Polycab/Apar/Leoni', taxRate: 18, price: 0 },
          { name: 'Communication Cable', uom: 'Mtrs', specifications: 'RS485/OFC Armoured', taxRate: 18, price: 0 },
          { name: 'MC4 Connectors', uom: 'Nos', specifications: '1500V, IP68', make: 'Staubli/Elcom', taxRate: 18, price: 0 },
          
          // Earthing & Protection
          { name: 'Earthing Kit', uom: 'Set', specifications: 'Chemical Earthing, Maintenance Free', taxRate: 18, price: 0 },
          { name: 'Lightning Arrester', uom: 'Nos', specifications: 'ESE Type, Early Streamer Emission', make: 'True Power/Reputed', taxRate: 18, price: 0 },
          { name: 'Earthing Strip/Wire', uom: 'Mtrs', specifications: 'GI/Cu Strips for grid bonding', taxRate: 18, price: 0 },
          
          // Balance of System
          { name: 'Cable Tray', uom: 'Mtrs', specifications: 'GI Perforated/Ladder Type', taxRate: 18, price: 0 },
          { name: 'Cable Laying Pipes', uom: 'Mtrs', specifications: 'DWC/HDPE Pipes', taxRate: 18, price: 0 },
          { name: 'Module Cleaning System', uom: 'Set', specifications: 'Semi-auto/Automatic, with pipelines', taxRate: 18, price: 0 },
          { name: 'Peripheral Lighting', uom: 'Set', specifications: 'LED Street lights with poles', taxRate: 18, price: 0 },
          { name: 'Lugs & Glands', uom: 'Set', specifications: 'Bimetallic/Al/Cu', make: 'Dowell\'s', taxRate: 18, price: 0 },
          
          // Services
          { name: 'Installation & Civil Work', uom: 'MWp', specifications: 'Complete I&C of project', taxRate: 18, price: 0 },
          { name: 'Transportation & Logistics', uom: 'Set', specifications: 'FOR Site delivery', taxRate: 18, price: 0 },
          { name: 'Design & Engineering', uom: 'Set', specifications: 'Structural & Electrical drawings', taxRate: 18, price: 0 },
          { name: 'Testing & Commissioning', uom: 'Set', specifications: 'Pre-commissioning tests', taxRate: 18, price: 0 },
          { name: 'Security & Fencing', uom: 'Mtrs', specifications: 'Chain-link/GI Fencing', taxRate: 18, price: 0 },
        ];
        await db.insert(schema.inventory).values(solarMaterials as any);
      }
    } catch (e) {
      console.error('Seeding inventory failed', e);
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
};
