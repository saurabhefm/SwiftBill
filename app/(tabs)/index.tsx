import React, { useState, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, RefreshControl, View, Text } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { getDb } from '@/src/db/client';
import { invoices, clients, businessProfile } from '@/src/db/schema';
import { desc, eq } from 'drizzle-orm';
import { InvoiceCard } from '@/src/components/InvoiceCard';
import { Moon, Sun, Plus } from 'lucide-react-native';
import { InvoiceStatus } from '@/src/components/StatusBadge';
import { useTheme } from '../../context/ThemeContext';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardScreen() {
  const { isDark, toggleTheme } = useTheme();
  const [invoiceList, setInvoiceList] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState('₹');
  const insets = useSafeAreaInsets();

  const fetchInvoices = async () => {
    try {
      const db = getDb();
      if (!db) return;

      // Use standard select for stability
      const profileResults = await db.select().from(businessProfile).limit(1);
      if (profileResults.length > 0) {
        setCurrency(profileResults[0].currency || '₹');
      }

      const results = await db.select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        date: invoices.date,
        total: invoices.total,
        status: invoices.status,
        clientName: clients.name,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .orderBy(desc(invoices.date));

      setInvoiceList(results);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInvoices();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#FAFAFA' }]}>
      <LinearGradient
        colors={isDark ? ['#1F2937', '#111827'] : ['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 20 }]}
      >
        <View style={styles.headerTextContainer}>
          <Text style={styles.greeting}>SwiftBill</Text>
          <Text style={styles.subtitle}>Manage your invoices</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.headerIconButton, { marginRight: 12 }]} 
            onPress={toggleTheme}
            activeOpacity={0.8}
          >
            {isDark ? <Sun color="#FFF" size={20} /> : <Moon color="#FFF" size={20} />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => router.push('/create-invoice')}
            activeOpacity={0.8}
          >
            <Plus color={isDark ? '#FFF' : '#6366F1'} size={24} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={invoiceList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <InvoiceCard
            invoiceNumber={item.invoiceNumber}
            clientName={item.clientName || 'No Client'}
            date={item.date}
            total={item.total}
            status={item.status as InvoiceStatus}
            currencySymbol={currency}
            onPress={() => router.push({ pathname: '/create-invoice', params: { id: item.id } })}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No invoices yet. Tap + to create one!</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTextContainer: { flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#FFFFFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  listContent: {
    padding: 20,
    paddingTop: 24,
  },
  emptyState: {
    marginTop: 120,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
