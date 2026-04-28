import React, { useState, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, View, Text, Platform, ScrollView } from 'react-native';
import { getDb } from '@/src/db/client';
import { inventory } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { Plus, Trash2, Edit2, FileSpreadsheet } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

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

  const handleImportExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'],
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
      // LAZY LOAD the parser
      const { parseInventoryExcel } = await import('@/src/utils/excelParser');
      const rows = await parseInventoryExcel(file.uri);

      if (rows.length === 0) {
        Alert.alert('No Data', 'File is empty or invalid.');
        return;
      }

      const db = getDb();
      if (!db) return;

      const existingItems = await db.select().from(inventory);
      const itemMap = new Map();
      existingItems.forEach(item => {
        const key = `${item.name.toLowerCase().trim()}|${(item.make || '').toLowerCase().trim()}`;
        itemMap.set(key, item.id);
      });

      let updated = 0, inserted = 0;
      for (const row of rows) {
        if (!row.name) continue;
        const key = `${row.name.toLowerCase().trim()}|${(row.make || '').toLowerCase().trim()}`;
        const data = {
          name: row.name,
          partNo: row.partNo || null,
          specifications: row.specifications || null,
          make: row.make || null,
          uom: row.uom || null,
          price: Number(row.price) || 0,
          taxRate: Number(row.taxRate) || 0,
        };

        if (itemMap.has(key)) {
          await db.update(inventory).set(data).where(eq(inventory.id, itemMap.get(key)));
          updated++;
        } else {
          await db.insert(inventory).values(data);
          inserted++;
        }
      }

      Alert.alert('Success', `Import Complete!\nNew: ${inserted}\nUpdated: ${updated}`);
      fetchInventory();
    } catch (error) {
      console.error('Import Error:', error);
      Alert.alert('Import Failed', 'Error reading file.');
    }
  };

  const handleDelete = async (id: number) => {
    const db = getDb();
    if (!db) return;
    Alert.alert('Delete', 'Delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await db.delete(inventory).where(eq(inventory.id, id));
        fetchInventory();
      }},
    ]);
  };

  const openEditor = (item?: InventoryItem) => {
    setCurrentItem(item || { name: '', partNo: '', specifications: '', make: '', uom: '', price: 0, taxRate: 0 });
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
          <Text style={styles.title}>{currentItem.id ? 'Edit Item' : 'New Item'}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 250 }}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Name</Text>
            <TextInput style={styles.input} value={currentItem.name} onChangeText={(v) => setCurrentItem({...currentItem, name: v})} placeholder="Item name" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Make / Brand</Text>
            <TextInput style={styles.input} value={currentItem.make || ''} onChangeText={(v) => setCurrentItem({...currentItem, make: v})} placeholder="e.g. Tata Solar" />
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Price</Text>
              <TextInput style={styles.input} value={currentItem.price?.toString()} onChangeText={(v) => setCurrentItem({...currentItem, price: Number(v) || 0})} keyboardType="numeric" />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>GST %</Text>
              <TextInput style={styles.input} value={currentItem.taxRate?.toString()} onChangeText={(v) => setCurrentItem({...currentItem, taxRate: Number(v) || 0})} keyboardType="numeric" />
            </View>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1 }} onPress={handleSave}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={[styles.gradientHeader, { paddingTop: Math.max(insets.top, 20) + 20 }]}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.gradientTitle}>Inventory</Text>
          <Text style={styles.subtitle}>Products & Services</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.addButton, { marginRight: 12 }]} onPress={handleImportExcel}>
            <FileSpreadsheet color="#6366F1" size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => openEditor()}>
            <Plus color="#6366F1" size={24} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={items}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.tag}>{item.make || 'No Brand'}</Text>
              <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FAFAFA' 
  },
  gradientHeader: { 
    paddingHorizontal: 24, 
    paddingBottom: 32, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32 
  },
  headerTextContainer: { 
    flex: 1 
  },
  gradientTitle: { 
    fontSize: 34, 
    fontWeight: '900', 
    color: '#FFFFFF' 
  },
  subtitle: { 
    fontSize: 16, 
    color: 'rgba(255, 255, 255, 0.8)' 
  },
  headerActions: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  addButton: { 
    backgroundColor: '#FFFFFF', 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: { 
    paddingHorizontal: 24, 
    paddingBottom: 24, 
    backgroundColor: '#FFFFFF' 
  },
  title: { 
    fontSize: 32, 
    fontWeight: '900', 
    color: '#111827' 
  },
  listContent: { 
    padding: 20 
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
    borderColor: '#EEE' 
  },
  cardInfo: { 
    flex: 1 
  },
  itemName: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#111827' 
  },
  itemPrice: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#6366F1', 
    marginTop: 4 
  },
  tag: { 
    fontSize: 12, 
    color: '#6B7280', 
    textTransform: 'uppercase' 
  },
  cardActions: { 
    flexDirection: 'row' 
  },
  iconButton: { 
    padding: 10, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 12 
  },
  inputGroup: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#6B7280', 
    marginBottom: 8 
  },
  input: { 
    backgroundColor: '#F3F4F6', 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16 
  },
  row: { 
    flexDirection: 'row' 
  },
  buttonRow: { 
    flexDirection: 'row', 
    marginTop: 12 
  },
  cancelButton: { 
    flex: 1, 
    backgroundColor: '#F3F4F6', 
    borderRadius: 16, 
    height: 60, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10 
  },
  cancelButtonText: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#374151' 
  },
  saveButton: { 
    borderRadius: 16, 
    height: 60, 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: '100%' 
  },
  saveButtonText: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#FFFFFF' 
  },
});
