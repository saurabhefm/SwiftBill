import { useState, useEffect } from 'react';
import { getDb } from '@/src/db/client';
import { invoices, businessProfile } from '@/src/db/schema';
import { count } from 'drizzle-orm';

export const useInvoiceNumber = () => {
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const refreshInvoiceNumber = async () => {
    try {
      setLoading(true);
      const db = getDb();
      if (!db) return;
      
      // 1. Get Prefix from Business Profile
      const profileResults = await db.select().from(businessProfile).limit(1);
      const profile = profileResults[0];
      const prefix = profile?.invoicePrefix || 'INV';
      
      // 2. Count existing invoices
      const [result] = await db.select({ value: count() }).from(invoices);
      const invoiceCount = result?.value || 0;
      
      // 3. Get current year
      const year = new Date().getFullYear();
      
      // 4. Format: [Prefix]-[Count+1]-[Year]
      const formattedNumber = `${prefix}-${String(invoiceCount + 1).padStart(4, '0')}-${year}`;
      
      setNextInvoiceNumber(formattedNumber);
    } catch (error) {
      console.error('Error generating invoice number:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshInvoiceNumber();
  }, []);

  return { nextInvoiceNumber, loading, refreshInvoiceNumber };
};
