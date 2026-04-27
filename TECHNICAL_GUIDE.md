# 🛠️ SwiftBill: Technical Architecture & Development Guide

This document serves as the master blueprint for the **SwiftBill (Solar Edition)** project. It contains everything needed to understand, rebuild, and enhance the application.

---

## 1. Project Overview & Tech Stack
SwiftBill is a cross-platform mobile application built for high-performance offline billing.

- **Frontend**: React Native with Expo (SDK 52).
- **Routing**: Expo Router (File-based routing).
- **State Management**: React Hooks (useState, useEffect, useCallback).
- **Database**: SQLite (via `expo-sqlite`) with Drizzle ORM.
- **Styling**: Custom Design System (Vanilla React Native StyleSheet).
- **PDF Engine**: `expo-print` + Custom HTML Templates.

---

## 2. Directory Structure & Key Files

### `/app` (The View Layer)
- `_layout.tsx`: The "Entry Point." Handles database initialization, splash screen logic, and the global Theme Provider.
- `(tabs)/index.tsx`: The Dashboard. Fetches and displays the recent invoice list.
- `(tabs)/inventory.tsx`: The Master Catalog. Manages the 35+ pre-loaded solar items.
- `create-invoice.tsx`: Complex logic for building invoices, calculating GST, and mapping inventory items.
- `create-bom.tsx`: Project costing logic, including profit margins and capacity-based calculations.

### `/src` (The Core Logic)
- `/db/schema.ts`: The "Source of Truth" for data. Defines tables for Clients, Invoices, BOMs, and Inventory.
- `/db/client.ts`: The "Engine Room." Handles database connection, table creation, migrations (ALTER TABLE), and data seeding.
- `/hooks/`: Contains custom logic like `useInvoiceNumber.ts` (auto-generating sequential IDs).
- `/utils/`: Contains the PDF templates (`invoiceTemplateGenerator.ts` and `bomTemplateGenerator.ts`).

---

## 3. How the Database (BE) Works

### Initialization (`initDb`)
The app uses an **Offline-First** approach. When the app starts:
1. It opens a local file called `swiftbill.db`.
2. It runs `CREATE TABLE IF NOT EXISTS` for all 7 core tables.
3. It performs "Auto-Migrations": It checks if columns like `specifications` or `uom` exist; if not, it adds them using `ALTER TABLE`.
4. It "Seeds" the data: If the inventory is empty, it injects the 35+ solar items automatically.

### Drizzle ORM
We use Drizzle to write Type-Safe queries. Instead of writing messy SQL strings for everything, we use:
```typescript
db.select().from(inventory).where(eq(inventory.make, 'Adani'));
```
This prevents errors and makes the code very easy to read.

---

## 4. UI & Business Logic

### Theme Engine
Located in `/context/ThemeContext.tsx`. It uses a React Context to provide `isDark` and `colors` to every screen instantly.

### Calculations
- **Invoices**: Calculates Subtotal -> Applies Discount -> Adds GST per item -> Final Total.
- **BOMs**: Includes "Cost per Wp" and "Profit Margin" logic. It translates project capacity (e.g., 30kW) into financial metrics.

### PDF Generation
1. The app takes the current Invoice/BOM state.
2. It passes the data into an HTML Template (`/src/utils/...`).
3. `expo-print` converts that HTML into a high-quality PDF.
4. `expo-sharing` triggers the native Android/iOS share sheet.

---

## 5. Technical Details for Future Rebuilds

### Environment Setup
If you move to a new laptop:
1. Install Node.js and Java 17+.
2. Install Android Studio and the SDK.
3. **CRITICAL**: Create `android/local.properties` and add `sdk.dir=PATH_TO_YOUR_SDK`.
4. Run `npm install`.

### Building the APK
- **Debug Build**: `npx expo run:android` (Requires computer connection).
- **Release Build**: `npx expo run:android --variant release` (Standalone APK).

### Common Fixes
- **White Screen**: Usually means the Metro bundler isn't running or the `dbReady` state is stuck.
- **Table Missing**: Check `client.ts` to ensure the `CREATE TABLE` string matches the `schema.ts` definition.
- **Signature Error**: Uninstall the old app before installing a new local build.

---
**Guide Version**: 1.0.0
**Project Lead**: Antigravity AI & Saurabh
