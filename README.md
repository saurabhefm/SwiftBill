# ☀️ SwiftBill (Solar Edition) 📑
**Professional Billing & BOM Management for Solar Energy Projects**

SwiftBill is a high-performance, offline-first mobile application designed specifically for solar engineers and contractors. Effortlessly manage your inventory, generate complex Bills of Materials (BOM), and create professional invoices with PDF sharing—all from the palm of your hand.

---

## 🚀 Key Features

- **🔋 Solar-First Inventory**: Pre-loaded with 35+ industry-standard items (Adani, Waaree, Tata Power, Sungrow, etc.).
- **📋 Smart BOM Module**: Create detailed project costings with automatic tax calculations, profit margin tracking, and revision history.
- **⚡ Preset BOM Generator**: Automatically scale and generate massive 30MWp+ project material lists with perfectly calculated physical unit ratios (Nos, tone, Lot) instantly.
- **🧾 Instant Invoicing**: Generate professional GST-ready invoices with itemized specifications and brand details.
- **📄 PDF Export & Share**: One-tap PDF generation for BOMs and Invoices to share directly with clients via WhatsApp or Email.
- **🏢 Business Profile**: Customize your company logo, bank details, and branding for a professional look.
- **🌓 Adaptive Theme**: Stunning Dark and Light modes for comfort in the field or the office.
- **💾 Offline First**: Built with SQLite and Drizzle ORM to ensure your data stays on your device, no internet required.

---

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo SDK 52](https://expo.dev/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Database**: [Drizzle ORM](https://orm.drizzle.team/) with [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- **Icons**: [Lucide React Native](https://lucide.dev/)
- **UI/Styling**: Custom Design System with [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)

---

## 🏗️ Getting Started

### Prerequisites
- Node.js (v18+)
- Android Studio & Android SDK (for local builds)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/saurabhefm/SwiftBill.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Start the Metro bundler:
```bash
npx expo start
```

### Build Production APK
To generate a stand-alone APK for your mobile device:
```bash
npx expo run:android --variant release
```

---

## 📜 Database Schema

The app uses a robust relational schema managed by Drizzle ORM:
- `business_profile`: Company identity and banking info.
- `inventory`: Master catalog of solar components.
- `invoices` & `invoice_items`: Complete billing lifecycle.
- `boms` & `bom_items`: Detailed project costing and revisions.

---

## 🤝 Contributing
Contributions are welcome! Feel free to open issues or submit pull requests to improve SwiftBill for the solar community.

---

## 📄 License
This project is licensed under the MIT License.

---
*Built with ❤️ for the Solar Energy Revolution.*
