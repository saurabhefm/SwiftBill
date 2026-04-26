import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBadge, InvoiceStatus } from './StatusBadge';
import { formatCurrency } from '../utils/currencyFormatter';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react-native';

interface InvoiceCardProps {
  invoiceNumber: string;
  clientName: string;
  date: string;
  total: number;
  status: InvoiceStatus;
  currencySymbol?: string;
  onPress?: () => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoiceNumber,
  clientName,
  date,
  total,
  status,
  currencySymbol,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
        <Text style={styles.clientName}>{clientName}</Text>
        <Text style={styles.date}>{format(new Date(date), 'dd MMM yyyy')}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.total}>{formatCurrency(total, currencySymbol)}</Text>
        <StatusBadge status={status} />
      </View>
      <ChevronRight size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  left: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  invoiceNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6366F1', // Indigo primary color
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  clientName: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '700',
    marginBottom: 6,
  },
  date: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  total: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
});
