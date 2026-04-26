import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform, View, Text } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { db } from '@/src/db/client';
import { invoices, invoiceItems, clients, businessProfile } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { useInvoiceNumber } from '@/src/hooks/useInvoiceNumber';
import { useInvoiceCalculator } from '@/src/hooks/useInvoiceCalculator';
import { Trash2, Plus, Save, FileText, Share2 } from 'lucide-react-native';
import { format } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateInvoiceHtml } from '@/src/utils/pdfTemplateGenerator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Item {
  id?: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

export default function CreateInvoiceScreen() {
  const { id } = useLocalSearchParams();
  const isEditing = !!id;
  
  const { nextInvoiceNumber } = useInvoiceNumber();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [date, setDate] = useState(new Date().toISOString());
  const [items, setItems] = useState<Item[]>([{ description: '', quantity: '1', unitPrice: '0' }]);
  const [taxRate, setTaxRate] = useState('0');
  const [discountRate, setDiscountRate] = useState('0');
  const [notes, setNotes] = useState('');

  const parsedItems = items.map(item => ({
    quantity: parseFloat(item.quantity) || 0,
    unitPrice: parseFloat(item.unitPrice) || 0,
  }));

  const { subtotal, taxAmount, discountAmount, total } = useInvoiceCalculator(
    parsedItems,
    parseFloat(taxRate) || 0,
    parseFloat(discountRate) || 0
  );

  useEffect(() => {
    if (!isEditing && nextInvoiceNumber) {
      setInvoiceNumber(nextInvoiceNumber);
    }
  }, [nextInvoiceNumber, isEditing]);

  useEffect(() => {
    if (isEditing) {
      loadInvoice();
    }
  }, [id]);

  const loadInvoice = async () => {
    try {
      const invId = parseInt(id as string);
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, invId));
      if (inv) {
        setInvoiceNumber(inv.invoiceNumber);
        setDate(inv.date);
        setTaxRate(inv.taxRate.toString());
        setDiscountRate(inv.discountRate.toString());
        setNotes(inv.notes || '');
        
        // Load client name
        if (inv.clientId) {
          const [client] = await db.select().from(clients).where(eq(clients.id, inv.clientId));
          if (client) setClientName(client.name);
        }

        // Load items
        const results = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invId));
        setItems(results.map(i => ({
          id: i.id,
          description: i.description,
          quantity: i.quantity.toString(),
          unitPrice: i.unitPrice.toString(),
        })));
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: '1', unitPrice: '0' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof Item, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!clientName) {
      Alert.alert('Error', 'Please enter a client name');
      return;
    }

    try {
      // 1. Ensure client exists or create
      let clientId: number;
      const [existingClient] = await db.select().from(clients).where(eq(clients.name, clientName));
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const [newClient] = await db.insert(clients).values({ name: clientName }).returning({ id: clients.id });
        clientId = newClient.id;
      }

      const invoiceData = {
        invoiceNumber,
        date,
        clientId,
        subtotal,
        taxRate: parseFloat(taxRate) || 0,
        taxAmount,
        discountRate: parseFloat(discountRate) || 0,
        discountAmount,
        total,
        notes,
        status: isEditing ? undefined : 'Draft',
      };

      let finalInvoiceId: number;

      if (isEditing) {
        finalInvoiceId = parseInt(id as string);
        await db.update(invoices).set(invoiceData).where(eq(invoices.id, finalInvoiceId));
        // Delete and re-insert items for simplicity
        await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, finalInvoiceId));
      } else {
        const [newInvoice] = await db.insert(invoices).values(invoiceData as any).returning({ id: invoices.id });
        finalInvoiceId = newInvoice.id;
      }

      // 2. Insert items
      const itemsToInsert = items.map(item => ({
        invoiceId: finalInvoiceId,
        description: item.description || 'No Description',
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        total: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
      }));

      await db.insert(invoiceItems).values(itemsToInsert);

      Alert.alert('Success', `Invoice ${isEditing ? 'updated' : 'created'} successfully!`);
      router.back();
    } catch (error) {
      console.error('Error saving invoice:', error);
      Alert.alert('Error', 'Failed to save invoice');
    }
  };

  const handleShare = async () => {
    try {
      const profile = await db.query.businessProfile.findFirst();
      if (!profile) return;

      const html = generateInvoiceHtml(
        profile,
        { name: clientName },
        {
          invoiceNumber,
          date,
          subtotal,
          taxRate: parseFloat(taxRate) || 0,
          taxAmount,
          discountRate: parseFloat(discountRate) || 0,
          discountAmount,
          total,
          notes,
        },
        items.map(i => ({
          description: i.description,
          quantity: parseFloat(i.quantity) || 0,
          unitPrice: parseFloat(i.unitPrice) || 0,
          total: (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
        }))
      );

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error sharing invoice:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Stack.Screen options={{ title: isEditing ? 'Edit Invoice' : 'New Invoice' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Info</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Invoice Number</Text>
            <TextInput
              style={styles.input}
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
              placeholder="INV-0001"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Client Name</Text>
            <TextInput
              style={styles.input}
              value={clientName}
              onChangeText={setClientName}
              placeholder="Enter client name"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items</Text>
            <TouchableOpacity onPress={addItem} style={styles.addSmallButton}>
              <Plus size={18} color="#2563EB" />
              <Text style={styles.addSmallText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={{ flex: 3 }}>
                <TextInput
                  style={styles.input}
                  value={item.description}
                  onChangeText={(v) => updateItem(index, 'description', v)}
                  placeholder="Description"
                />
              </View>
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <TextInput
                  style={styles.input}
                  value={item.quantity}
                  onChangeText={(v) => updateItem(index, 'quantity', v)}
                  keyboardType="numeric"
                  placeholder="Qty"
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <TextInput
                  style={styles.input}
                  value={item.unitPrice}
                  onChangeText={(v) => updateItem(index, 'unitPrice', v)}
                  keyboardType="numeric"
                  placeholder="Price"
                />
              </View>
              <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeButton}>
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taxes & Discounts</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Tax (%)</Text>
              <TextInput
                style={styles.input}
                value={taxRate}
                onChangeText={setTaxRate}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Discount (%)</Text>
              <TextInput
                style={styles.input}
                value={discountRate}
                onChangeText={setDiscountRate}
                keyboardType="numeric"
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Additional terms or notes"
            />
          </View>
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>-₹{discountAmount.toFixed(2)}</Text>
            </View>
          )}
          {taxAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>₹{taxAmount.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 10, paddingTop: 10 }]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBarContainer}>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleShare}>
            <Share2 size={20} color="#374151" />
            <Text style={styles.secondaryButtonText}>Share PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} style={{ flex: 1, marginLeft: 10 }} onPress={handleSave}>
            <LinearGradient
              colors={['#4F46E5', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.actionButton, styles.primaryButtonGradient]}
            >
              <Save size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>Save Invoice</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120, // Extra padding to clear the bottom bar
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
    shadowColor: '#6366F1',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  removeButton: {
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    marginLeft: 8,
  },
  addSmallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addSmallText: {
    color: '#6366F1',
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 13,
  },
  summarySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
    shadowColor: '#6366F1',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#6366F1',
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 231, 235, 0.5)',
  },
  bottomBar: {
    padding: 20,
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonGradient: {
    shadowColor: '#4F46E5',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 16,
  },
});
