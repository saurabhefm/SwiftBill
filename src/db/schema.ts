import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const businessProfile = sqliteTable('business_profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  logoUri: text('logo_uri'),
  currency: text('currency').default('₹'),
  invoicePrefix: text('invoice_prefix').default('INV'),
});

export const clients = sqliteTable('clients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
});

export const inventory = sqliteTable('inventory', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  partNo: text('part_no'),
  specifications: text('specifications'),
  make: text('make'),
  uom: text('uom'),
  price: real('price').notNull().default(0),
  taxRate: real('tax_rate').notNull().default(0),
});

export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceNumber: text('invoice_number').notNull().unique(),
  date: text('date').notNull(),
  dueDate: text('due_date'),
  status: text('status').notNull().default('Draft'),
  clientId: integer('client_id').references(() => clients.id),
  subtotal: real('subtotal').notNull().default(0),
  taxRate: real('tax_rate').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  discountRate: real('discount_rate').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  total: real('total').notNull().default(0),
  notes: text('notes'),
});

export const invoiceItems = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id),
  description: text('description').notNull(),
  partNo: text('part_no'),
  specifications: text('specifications'),
  make: text('make'),
  uom: text('uom'),
  quantity: real('quantity').notNull().default(0),
  unitPrice: real('unit_price').notNull().default(0),
  taxRate: real('tax_rate').notNull().default(0),
  total: real('total').notNull().default(0),
});

export const boms = sqliteTable('boms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectName: text('project_name').notNull(),
  clientId: integer('client_id').references(() => clients.id),
  date: text('date').notNull(),
  revision: integer('revision').notNull().default(0),
  parentId: integer('parent_id'),
  globalTaxRate: real('global_tax_rate').notNull().default(0),
  globalTaxAmount: real('global_tax_amount').notNull().default(0),
  projectCapacity: real('project_capacity').notNull().default(30),
  profitRate: real('profit_rate').notNull().default(0),
  totalCost: real('total_cost').notNull().default(0),
  status: text('status').notNull().default('Draft'),
  notes: text('notes'),
});

export const bomItems = sqliteTable('bom_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bomId: integer('bom_id').notNull().references(() => boms.id),
  description: text('description').notNull(),
  partNo: text('part_no'),
  specifications: text('specifications'),
  make: text('make'),
  uom: text('uom'),
  quantity: real('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull().default(0),
  taxRate: real('tax_rate').notNull().default(0),
  total: real('total').notNull().default(0),
  remark: text('remark'),
});
