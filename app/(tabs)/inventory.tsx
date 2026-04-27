import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, View, Text, Platform, ScrollView } from 'react-native';
import { getDb } from '@/src/db/client';
import { inventory } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { Plus, Trash2, Edit2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

interface InventoryItem {
  id: number;
  name: string;
  partNo: string | null;
  specifications: string | null;
  make: string | null;
  uom: string | null;
  price: number;
  taxRate: number;
}


export default function InventoryScreen() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<InventoryItem>>({
    name: '', partNo: '', specifications: '', make: '', uom: '', price: 0, taxRate: 0
  });
  const insets = useSafeAreaInsets();


  const fetchInventory = async () => {
    const db = getDb();
    if (!db) return;
    try {
      const results = await db.select().from(inventory);
      setItems(results as InventoryItem[]);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [])
  );

  const handleSave = async () => {
    if (!currentItem.name) {
      Alert.alert('Error', 'Item name is required');
      return;
    }

    const db = getDb();
    if (!db) return;
    try {
      const itemData = {
        name: currentItem.name,
        partNo: currentItem.partNo || null,
        specifications: currentItem.specifications || null,
        make: currentItem.make || null,
        uom: currentItem.uom || null,
        price: Number(currentItem.price) || 0,
        taxRate: Number(currentItem.taxRate) || 0,
      };


      if (currentItem.id) {
        await db.update(inventory).set(itemData).where(eq(inventory.id, currentItem.id));
      } else {
        await db.insert(inventory).values(itemData);
      }
      
      setIsEditing(false);
      setCurrentItem({ name: '', partNo: '', specifications: '', make: '', uom: '', price: 0, taxRate: 0 });
      fetchInventory();

    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item');
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Delete', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await db.delete(inventory).where(eq(inventory.id, id));
          fetchInventory();
        } catch (error) {
          console.error('Error deleting item:', error);
        }
      }},
    ]);
  };

  const openEditor = (item?: InventoryItem) => {
    if (item) {
      setCurrentItem(item);
    } else {
      setCurrentItem({ name: '', partNo: '', specifications: '', make: '', uom: '', price: 0, taxRate: 0 });
    }
    setIsEditing(true);

  };

  if (isEditing) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
          <Text style={styles.title}>{currentItem.id ? 'Edit Item' : 'New Item'}</Text>
        </View>
        <ScrollView 
          contentContainerStyle={{ padding: 24, paddingBottom: 250 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name</Text>
            <TextInput style={styles.input} value={currentItem.name} onChangeText={(v) => setCurrentItem({...currentItem, name: v})} placeholder="e.g. Graphic Design Services" placeholderTextColor="#94a3b8" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Part / SKU No</Text>
            <TextInput style={styles.input} value={currentItem.partNo || ''} onChangeText={(v) => setCurrentItem({...currentItem, partNo: v})} placeholder="e.g. SV-001" placeholderTextColor="#94a3b8" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Make / Brand</Text>
            <TextInput style={styles.input} value={currentItem.make || ''} onChangeText={(v) => setCurrentItem({...currentItem, make: v})} placeholder="e.g. Tata / ABB / Schneider" placeholderTextColor="#94a3b8" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>UOM (Unit of Measure)</Text>
            <TextInput style={styles.input} value={currentItem.uom || ''} onChangeText={(v) => setCurrentItem({...currentItem, uom: v})} placeholder="e.g. MWp / Nos / Mtrs" placeholderTextColor="#94a3b8" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Technical Specifications</Text>
            <TextInput 
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
              value={currentItem.specifications || ''} 
              onChangeText={(v) => setCurrentItem({...currentItem, specifications: v})} 
              multiline 
              placeholder="Detailed technical specs..." 
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Default Price</Text>
              <TextInput style={styles.input} value={currentItem.price?.toString()} onChangeText={(v) => setCurrentItem({...currentItem, price: Number(v) || 0})} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#94a3b8" />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>GST (%)</Text>
              <TextInput style={styles.input} value={currentItem.taxRate?.toString()} onChangeText={(v) => setCurrentItem({...currentItem, taxRate: Number(v) || 0})} keyboardType="numeric" placeholder="0" placeholderTextColor="#94a3b8" />
            </View>
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={{ flex: 1 }} onPress={handleSave}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save Item</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientHeader, { paddingTop: Math.max(insets.top, 20) + 20 }]}
      >
        <View style={styles.headerTextContainer}>
          <Text style={styles.gradientTitle}>Inventory</Text>
          <Text style={styles.subtitle}>Manage products & services</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => openEditor()} activeOpacity={0.8}>
          <Plus color="#6366F1" size={24} />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={items}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.tagContainer}>
                {item.partNo && <Text style={styles.tag}>Part: {item.partNo}</Text>}
                {item.make && <Text style={styles.tag}>Make: {item.make}</Text>}
                {item.uom && <Text style={styles.tag}>UOM: {item.uom}</Text>}
              </View>
              <Text style={styles.itemPrice}>₹{item.price.toFixed(2)} <Text style={styles.itemTax}>(+{item.taxRate}% GST)</Text></Text>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.iconButton} onPress={() => openEditor(item)}>
                <Edit2 size={20} color="#4B5563" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconButton, { marginLeft: 8 }]} onPress={() => handleDelete(item.id)}>
                <Trash2 size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Your inventory is empty. Add items to speed up invoicing!</Text>
          </View>
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
  gradientHeader: {
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
  headerTextContainer: {
    flex: 1,
  },
  gradientTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
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
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(229, 231, 235, 0.5)',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  listContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  itemPart: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
    marginTop: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    fontSize: 11,
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  itemTax: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  emptyState: {
    marginTop: 120,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  formContainer: {
    padding: 24,
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
  },
  row: {
    flexDirection: 'row',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  saveButton: {
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
