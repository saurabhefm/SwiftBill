import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

interface StatusBadgeProps {
  status: InvoiceStatus;
}

const statusColors = {
  Draft: { bg: 'rgba(107, 114, 128, 0.1)', text: '#4B5563', border: 'rgba(107, 114, 128, 0.2)' },
  Sent: { bg: 'rgba(59, 130, 246, 0.1)', text: '#2563EB', border: 'rgba(59, 130, 246, 0.2)' },
  Paid: { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', border: 'rgba(16, 185, 129, 0.2)' },
  Overdue: { bg: 'rgba(239, 68, 68, 0.1)', text: '#DC2626', border: 'rgba(239, 68, 68, 0.2)' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colors = statusColors[status] || statusColors.Draft;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

