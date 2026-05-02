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
  projectCapacity: number;
  profitRate: number;
  totalBasicCost: number;
  notes?: string | null;
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

  const capacityInWp = bom.projectCapacity * 1000000;
  const costPerWp = bom.totalCost / capacityInWp;
  const profitAmount = bom.totalBasicCost - bom.totalCost;
  const profitPerWp = profitAmount / capacityInWp;
  const basicCostPerWp = bom.totalBasicCost / capacityInWp;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Helvetica', Arial, sans-serif; color: #333; margin: 0; padding: 10px; font-size: 10px; }
          
          .header { text-align: center; margin-bottom: 15px; background-color: #fbbf24; padding: 12px; border-radius: 5px; }
          .header h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
          .header p { margin: 5px 0 0 0; font-weight: bold; font-size: 11px; color: #444; }
          
          .meta-info { display: flex; justify-content: space-between; margin-bottom: 15px; background: #f9fafb; padding: 10px; border: 1px solid #e5e7eb; border-radius: 5px; }
          .meta-info div p { margin: 2px 0; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
          th { background-color: #e5e7eb; padding: 6px; border: 1px solid #9ca3af; text-align: left; font-size: 8px; text-transform: uppercase; }
          td { padding: 6px; border: 1px solid #d1d5db; vertical-align: top; word-wrap: break-word; font-size: 9px; }
          
          .totals-section { margin-left: auto; width: 350px; background: #111827; color: white; padding: 20px; border-radius: 8px; text-align: right; }
          .totals-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .totals-row p { margin: 0; font-size: 10px; opacity: 0.8; }
          .totals-row.highlight { background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 4px; margin: 5px -8px; }
          .totals-row.grand { border-top: 1px solid #374151; margin-top: 10px; padding-top: 10px; }
          .totals-row.grand h2 { margin: 0; font-size: 22px; color: #10b981; }
          
          .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; font-size: 10px; color: #666; }
          
          @media print {
            html, body { height: auto !important; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Detailed Price Breakup / BOM</h1>
          <p>FOR ${bom.projectCapacity} MWp Dc ( ${(bom.projectCapacity * 0.75).toFixed(1)} MW AC ) ground mounted project</p>
          <p style="margin-top: 8px; font-size: 14px; color: #000;">${bom.projectName}</p>
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
              <th style="width: 4%;">Sr.</th>
              <th style="width: 15%;">Material</th>
              <th style="width: 25%;">Specifications</th>
              <th style="width: 12%;">Make</th>
              <th style="width: 5%; text-align: center;">Qty</th>
              <th style="width: 6%; text-align: center;">UOM</th>
              <th style="width: 10%; text-align: right;">Rate</th>
              <th style="width: 5%; text-align: center;">GST</th>
              <th style="width: 10%; text-align: right;">Amount</th>
              <th style="width: 8%;">Remark</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="totals-row">
            <p>TOTAL MATERIAL COST</p>
            <p>${currencySymbol}${bom.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div class="totals-row">
            <p>ESTIMATED GST</p>
            <p>${currencySymbol}${(bom.totalCost - bom.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div class="totals-row grand">
            <p style="font-weight: bold; opacity: 1;">TOTAL PROJECT COST</p>
            <h2>${currencySymbol}${bom.totalBasicCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
          </div>
          <div class="totals-row highlight" style="margin-top: 10px;">
            <p style="color: #10b981; font-weight: bold;">COST / Wp</p>
            <p style="color: #10b981; font-weight: bold;">${currencySymbol}${basicCostPerWp.toFixed(4)}</p>
          </div>
        </div>


        ${bom.notes ? `
        <div style="margin-top: 30px; padding: 15px; background: #fefce8; border: 1px solid #fef08a; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #854d0e;">Notes & Exclusions</h3>
          <p style="margin: 0; white-space: pre-wrap; font-size: 10px; line-height: 1.5;">${bom.notes}</p>
        </div>
        ` : ''}




        <div class="footer">
          <p>Generated by SwiftBill - Professional Inventory & Invoicing</p>
          <p>This is a computer generated document. Revision tracking ensures project history integrity.</p>
        </div>
      </body>
    </html>
  `;
};
