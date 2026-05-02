import { format } from 'date-fns';

interface BusinessProfile {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  logoUri?: string | null;
  currency?: string | null;
}

interface Client {
  name: string;
  address?: string | null;
  email?: string | null;
}

interface InvoiceItem {
  description: string;
  partNo?: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

interface Invoice {
  invoiceNumber: string;
  date: string;
  dueDate?: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  notes?: string | null;
}

export const generateInvoiceHtml = (
  profile: BusinessProfile,
  client: Client,
  invoice: Invoice,
  items: InvoiceItem[]
) => {
  const currencySymbol = profile.currency || '₹';
  
  const itemsHtml = items.map(item => `
    <tr>
      <td>${item.description}</td>
      <td style="font-family: monospace; color: #666;">${item.partNo || '-'}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">${currencySymbol}${item.unitPrice.toFixed(2)}</td>
      <td style="text-align: right;">${item.taxRate}%</td>
      <td style="text-align: right;">${currencySymbol}${item.total.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .logo { max-width: 150px; max-height: 80px; }
          .business-info { text-align: right; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .client-info h3, .invoice-info h3 { margin-top: 0; color: #666; font-size: 14px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { background-color: #f8f8f8; text-align: left; padding: 10px; border-bottom: 2px solid #eee; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          .totals { margin-left: auto; width: 300px; }
          .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .grand-total { border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 18px; }
          .footer { margin-top: 60px; border-top: 1px solid #eee; padding-top: 20px; color: #999; font-size: 12px; }
          .bank-details { background: #fdfdfd; padding: 15px; border-radius: 5px; margin-top: 20px; }
          
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
          <div class="logo-container">
            ${profile.logoUri ? `<img src="${profile.logoUri}" class="logo" />` : `<h1>${profile.name}</h1>`}
          </div>
          <div class="business-info">
            <h2>INVOICE</h2>
            <p><strong>${invoice.invoiceNumber}</strong></p>
            <p>${format(new Date(invoice.date), 'dd MMM yyyy')}</p>
          </div>
        </div>

        <div class="invoice-details">
          <div class="client-info">
            <h3>Bill To</h3>
            <p><strong>${client.name}</strong></p>
            <p>${client.address || ''}</p>
            <p>${client.email || ''}</p>
          </div>
          <div class="business-info-details">
            <h3>From</h3>
            <p><strong>${profile.name}</strong></p>
            <p>${profile.address || ''}</p>
            <p>${profile.phone || ''}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Part No</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">GST</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${currencySymbol}${invoice.subtotal.toFixed(2)}</span>
          </div>
          ${invoice.discountAmount > 0 ? `
            <div class="total-row">
              <span>Discount (${invoice.discountRate}%)</span>
              <span>-${currencySymbol}${invoice.discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          ${invoice.taxAmount > 0 ? `
            <div class="total-row">
              <span>Total Tax</span>
              <span>${currencySymbol}${invoice.taxAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-row grand-total">
            <span>Total</span>
            <span>${currencySymbol}${invoice.total.toFixed(2)}</span>
          </div>
        </div>

        ${profile.bankName ? `
          <div class="bank-details">
            <h3>Payment Details</h3>
            <p>Bank: ${profile.bankName}</p>
            <p>Account: ${profile.bankAccount}</p>
          </div>
        ` : ''}

        ${invoice.notes ? `
          <div class="footer">
            <p><strong>Notes:</strong> ${invoice.notes}</p>
          </div>
        ` : ''}
      </body>
    </html>
  `;
};
