import { format } from 'date-fns';

interface BusinessProfile {
  name: string;
  address?: string | null;
  phone?: string | null;
  logoUri?: string | null;
  currency?: string | null;
}

interface BOM {
  projectName: string;
  revision: number;
  date: string;
  subtotal: number;
  globalTaxRate: number;
  globalTaxAmount: number;
  totalCost: number;
}

interface BOMItem {
  description: string;
  specifications?: string | null;
  make?: string | null;
  uom?: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
  remark?: string | null;
}


export const generateBOMHtml = (
  profile: BusinessProfile,
  bom: BOM,
  items: BOMItem[]
) => {
  const currencySymbol = profile.currency || '₹';
  
  const itemsHtml = items.map((item, index) => `
    <tr>
      <td style="text-align: center;">${index + 1}</td>
      <td style="font-weight: bold;">${item.description}</td>
      <td style="font-size: 10px; color: #444;">${item.specifications || '-'}</td>
      <td>${item.make || '-'}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: center;">${item.uom || '-'}</td>
      <td style="text-align: right;">${currencySymbol}${item.unitPrice.toLocaleString()}</td>
      <td style="text-align: center;">${item.taxRate}%</td>
      <td style="text-align: right; font-weight: bold;">${currencySymbol}${item.total.toLocaleString()}</td>
      <td style="font-size: 10px;">${item.remark || '-'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: 'Helvetica', Arial, sans-serif; color: #333; margin: 0; padding: 20px; font-size: 11px; }
          .header { text-align: center; margin-bottom: 20px; background-color: #fbbf24; padding: 15px; border-radius: 5px; }
          .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
          
          .meta-info { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f9fafb; padding: 15px; border: 1px solid #e5e7eb; }
          .meta-info div p { margin: 4px 0; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
          th { background-color: #e5e7eb; padding: 8px; border: 1px solid #9ca3af; text-align: left; font-size: 9px; text-transform: uppercase; }
          td { padding: 8px; border: 1px solid #d1d5db; vertical-align: top; word-wrap: break-word; }
          
          .totals-section { margin-left: auto; width: 300px; background: #111827; color: white; padding: 20px; border-radius: 8px; text-align: right; }
          .totals-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .totals-row p { margin: 0; font-size: 11px; opacity: 0.8; }
          .totals-row.grand { border-top: 1px solid #374151; margin-top: 10px; padding-top: 10px; }
          .totals-row.grand h2 { margin: 0; font-size: 22px; color: #10b981; }
          
          .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Detailed Price Breakup / BOM</h1>
          <p style="margin: 5px 0 0 0; font-weight: bold;">${bom.projectName}</p>
        </div>

        <div class="meta-info">
          <div>
            <p><strong>Issued By:</strong> ${profile.name}</p>
            <p><strong>Contact:</strong> ${profile.phone || '-'}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Revision:</strong> <span style="color: #059669; font-weight: bold;">REV ${bom.revision}</span></p>
            <p><strong>Date:</strong> ${format(new Date(bom.date), 'dd MMMM yyyy')}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">Sr.</th>
              <th style="width: 100px;">Material</th>
              <th style="width: 160px;">Specifications</th>
              <th style="width: 70px;">Make</th>
              <th style="width: 35px; text-align: center;">Qty</th>
              <th style="width: 35px; text-align: center;">UOM</th>
              <th style="width: 75px; text-align: right;">Rate</th>
              <th style="width: 35px; text-align: center;">GST</th>
              <th style="width: 80px; text-align: right;">Amount</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="totals-row">
            <p>SUBTOTAL</p>
            <p>${currencySymbol}${bom.subtotal.toLocaleString()}</p>
          </div>
          <div class="totals-row">
            <p>TOTAL GST</p>
            <p>${currencySymbol}${(bom.totalCost - bom.subtotal).toLocaleString()}</p>
          </div>
          <div class="totals-row grand">
            <p style="font-weight: bold; opacity: 1;">GRAND TOTAL</p>
            <h2>${currencySymbol}${bom.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
          </div>
        </div>


        <div class="footer">
          <p>Generated by SwiftBill - Professional Inventory & Invoicing</p>
          <p>This is a computer generated document. Revision tracking ensures project history integrity.</p>
        </div>
      </body>
    </html>
  `;
};
