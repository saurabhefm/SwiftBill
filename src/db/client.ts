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
    
    // Safely add new columns
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
        { 
          name: 'Solar PV Module', 
          uom: 'MWp', 
          specifications: 'Ongrid String Inverter 275 kW AC at 50 deg C 1500 VDC/800VAC (IEC61727, IEC 62116)', 
          taxRate: 12 
        },
        { 
          name: 'String Inverter', 
          make: 'Wattpower/Sungrow/sineng/reputed', 
          specifications: 'Ongrid String Inverter 275 kW AC at 50 deg C 1500 VDC/800VAC (IEC61727, IEC 62116)', 
          uom: 'Nos', 
          taxRate: 12 
        },
        { 
          name: 'MMS Structure with Civil Foundation', 
          specifications: '2 panel (2p) Fixed Tilt : Hot Dip Galvanized & Galvalume Design Standard: IS 800-2007 for Hot Rolled & IS 801- 2007 for Cold Formed Structures', 
          make: 'Standard/Reputed Make as per Design',
          uom: 'MWp', 
          taxRate: 18 
        },
        { 
          name: 'LT Panel', 
          specifications: 'Confirming Indian Electricity Act & IS standards suitable to 800V, Type : Outdoor IP 65, Enclosure: CRCA, PROTECTION LSIG/UV/OV/SPP', 
          make: 'Trackerz/Alnico/L&T/Eaton/ABB',
          uom: 'Nos', 
          taxRate: 18 
        },
        { 
          name: 'HT Panel/VCB', 
          specifications: 'Standard : 11 KV VCB, Outdoor IP 65, Enclosure : Fabricated from CRCA, PROTECTION OPERATE LOCAL IDMT, AANNOUNCAETOR, HOOTER', 
          make: 'Trackerz/Alnico/L&T/ABB/Schneider',
          uom: 'Nos', 
          taxRate: 18 
        },
        { 
          name: 'Inverter duty transformer', 
          make: 'ABC/Royal/Powertech/Kv/enerwave', 
          specifications: 'Design : IS 2026, Step-Up Transformer, Type : Oil Cooled ONAN Inverter Duty (OCTC TYPE) AL wound', 
          uom: 'Nos', 
          taxRate: 18 
        },
        { 
          name: 'Auxilliary Transformer', 
          specifications: '3 Phase, RATING: 25 KVA, Vector: DYN11, Oil Type (800V/ 400V)', 
          make: 'Standard',
          uom: 'Nos', 
          taxRate: 18 
        },
        { 
          name: 'UPS', 
          make: 'LUMINOUS online', 
          specifications: '1PH 5KVA UPS with batteries & accessories for WMS System & SCADA (0.5 Hrs Backup)', 
          uom: 'Nos', 
          taxRate: 18 
        },
        { 
          name: 'SCADA Monitoring System', 
          make: 'HKRP/SURYALOG/Trasco/AMR logix', 
          specifications: 'As per design, Perforated GI with cover',
          uom: 'Nos', 
          taxRate: 18 
        },
        { 
          name: 'Weather Station', 
          specifications: 'WMS logger, Pyranometer, Module Temperature Sensor, Ambient Temperature Sensor, Wind speed Sensor', 
          make: 'HKRP/SURYALOG/Trasco/AMR logix',
          uom: 'Set', 
          taxRate: 18 
        },
        { 
          name: 'AC Cables', 
          make: 'Polycab/apar/Avocab/Reputed', 
          specifications: 'Standard : IS 1554-1&2 / IS7098 -1&2, Aluminium Stranded XLPE insulated',
          uom: 'Mtrs', 
          taxRate: 18 
        },
        { 
          name: 'DC Cables', 
          make: 'Polycab/apar/Avocab/Reputed', 
          specifications: 'Tinned Copper conductor, XLPO Insulated, UV, Ozone, Temp & Hydrolysis resistant, 1C x 4 Sq. mm. 1500 VDC, Standard : EN50396',
          uom: 'Mtrs', 
          taxRate: 18 
        },
        { 
          name: 'Multi Contact Connector', 
          make: 'Staubli/Elcom/Elmex', 
          specifications: '1500 VDC Copper Tinned Plated, MC4 (Male and Female), IP68 Safety Class - Class- II',
          uom: 'Nos', 
          taxRate: 18 
        },
        { 
          name: 'Earthing Cable & Accessories', 
          specifications: 'Standard : IS 3043:1987, Chemo Maintenance Free, 50KA, 50mm x 3Mtrs, 25x3 GI FLAT SMB, 50x6 GI FLAT AC Equip Earthing',
          make: 'JSR/true power/reputed',
          uom: 'Set', 
          taxRate: 18 
        },
        { 
          name: 'Lugs and Accessories', 
          make: 'DOWELLS MAKE', 
          specifications: 'BI-METALLIC Lugs and Accessories',
          uom: 'Set', 
          taxRate: 18 
        },
        { 
          name: 'Lightning Arrester', 
          make: 'SABO/JEF/True Power/Orbital', 
          specifications: 'Standard : NFC 17-102, Early Streamer Emission (ESE), Level III, Radius 107 meter, DT: 60mS',
          uom: 'Nos', 
          taxRate: 18 
        },
        { 
          name: 'Cable Lying Pipe', 
          specifications: 'DWC Pipe for DC Cabling, High-density polyethylene / AC Cable laying in trench',
          make: 'Reputed make',
          uom: 'Mtrs', 
          taxRate: 18 
        },
        { 
          name: 'Cable Tray', 
          specifications: 'As per design, Perforated GI with cover',
          make: 'Standard/Reputed Make',
          uom: 'Mtrs', 
          taxRate: 18 
        },
        { 
          name: 'Communication Cable', 
          specifications: 'RS 485, 0.5 sqmm, 1 pair armoured, shielded cable',
          make: 'Reputed make',
          uom: 'Mtrs', 
          taxRate: 18 
        },
        { 
          name: 'Module Cleaning System', 
          specifications: 'Internal water pipeline for Manual Water-based Module Cleaning; UPVC Pipe ZIG ZOG',
          make: 'Reputed make',
          uom: 'Set', 
          taxRate: 18 
        },
        { 
          name: 'Peripheral Lighting', 
          specifications: 'Peripheral Lighting with 20W LED street lights, Pole height 4 mtr',
          make: 'Reputed make',
          uom: 'Set', 
          taxRate: 18 
        },
        { 
          name: 'Borewell', 
          specifications: 'Water Tank 10000 ltr, Motor, etc',
          make: 'Standard',
          uom: 'Nos', 
          taxRate: 18 
        },
        { 
          name: 'Pheripherical road', 
          specifications: 'Normal murum road',
          make: 'custom',
          uom: 'Mtrs', 
          taxRate: 18 
        },
        { 
          name: 'Drainage', 
          specifications: 'earthen/open drainage system (Without RCC)',
          make: 'As per Design',
          uom: 'Mtrs', 
          taxRate: 18 
        },
        { 
          name: 'Transportation', 
          specifications: 'As per requirement',
          make: 'Custom',
          uom: 'Set', 
          taxRate: 18 
        },
        { 
          name: 'ABT Meter Unit & CTPT', 
          specifications: 'As per Discom Rules & Regulation (for Solar Plant End)',
          make: 'Secure/Discom Approved',
          uom: 'Set', 
          taxRate: 18 
        },
        { 
          name: 'Installation & Civil Work', 
          specifications: 'Civil for MMS, ACDB Panel, VCB PANEL, Transformer, Inverter',
          make: 'As per Design',
          uom: 'MWp', 
          taxRate: 18 
        },
      ];
      await db.insert(schema.inventory).values(solarMaterials as any);
      console.log('Inventory seeded with full Solar Project specs');
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};
