import { useMemo } from 'react';

interface InvoiceItem {
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export const useInvoiceCalculator = (
  items: InvoiceItem[],
  discountRate: number = 0
) => {
  return useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemTax = itemTotal * ((item.taxRate || 0) / 100);
      
      subtotal += itemTotal;
      taxAmount += itemTax;
    });

    const discountAmount = (subtotal * discountRate) / 100;
    
    // Total is calculated by subtracting discount from subtotal, then adding the accumulated item taxes.
    const total = (subtotal - discountAmount) + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total,
    };
  }, [items, discountRate]);
};
