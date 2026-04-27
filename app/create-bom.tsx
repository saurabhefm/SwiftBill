import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform, View, Text, Modal, FlatList, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { getDb } from '@/src/db/client';
import { boms, bomItems, clients, inventory, businessProfile } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Trash2, Plus, Save, Share2, History, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateBOMHtml } from '@/src/utils/bomTemplateGenerator';

interface BOMItem {
  id?: number;
  description: string;
  partNo?: string;
  specifications: string;
  make: string;
  uom: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  remark: string;
}


export default function CreateBOMScreen() {
  const { id } = useLocalSearchParams();
  const isEditing = !!id;

  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [date, setDate] = useState(new Date().toISOString());
  const [revision, setRevision] = useState(0);
  const [globalTaxRate, setGlobalTaxRate] = useState('0');
  const [projectCapacity, setProjectCapacity] = useState('30');
  const [profitRate, setProfitRate] = useState('0');
  const [inventorySearch, setInventorySearch] = useState('');
  const [notes, setNotes] = useState('Above Pricing is inclusive of supply of above material & installation but excluding the following:\n1. CCTV Surveillance System charges shall be extra\n2. Project insurance shall be in client scope\n3. Temporary electricity connection during construction period shall be client responsibility\n4. Tax shall be extra as actual\n5. Boundary Fencing shall be in client scope\n6. Local issue shall be takencare by client\n7. Extra material shall be taken by Solveig solar pvt ltd\n8. Full-time service support for a period of 3 months from date of commissioning\n9. Defect liability period is not applicable');


  const [items, setItems] = useState<BOMItem[]>([{

    description: '', specifications: '', make: '', uom: '', quantity: '1', unitPrice: '0', taxRate: '0', remark: ''
  }]);


  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  const subtotal = items.reduce((acc, item) => {
    return acc + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
  }, 0);

  const itemTaxes = items.reduce((acc, item) => {
    const rate = parseFloat(item.taxRate) || 0;
    if (rate > 0) {
      return acc + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0) * (rate / 100);
    }
    return acc;
  }, 0);

  const globalTaxBasis = items.reduce((acc, item) => {
    const rate = parseFloat(item.taxRate) || 0;
    if (rate === 0) {
      return acc + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
    }
    return acc;
  }, 0);

  const globalTaxAmount = (globalTaxBasis * (parseFloat(globalTaxRate) || 0)) / 100;
  const totalTax = itemTaxes + globalTaxAmount;
  const totalProjectCost = subtotal + totalTax;
  
  const profitAmount = (totalProjectCost * (parseFloat(profitRate) || 0)) / 100;
  const totalBasicCost = totalProjectCost + profitAmount;
  
  const capacityInWp = (parseFloat(projectCapacity) || 1) * 1000000;
  const costPerWp = totalProjectCost / capacityInWp;
  const profitPerWp = profitAmount / capacityInWp;
  const basicCostPerWp = totalBasicCost / capacityInWp;



  useEffect(() => {
    if (isEditing) loadBOM();
    loadInventory();
  }, [id]);

  const loadInventory = async () => {
    const db = getDb();
    if (!db) return;
    const results = await db.select().from(inventory);
    setInventoryList(results);
  };

  const loadBOM = async () => {
    try {
      const db = getDb();
      if (!db) return;
      const bomId = parseInt(id as string);
      const [bom] = await db.select().from(boms).where(eq(boms.id, bomId));
      if (bom) {
        setProjectName(bom.projectName);
        setRevision(bom.revision);
        setGlobalTaxRate(bom.globalTaxRate?.toString() || '0');
        setProjectCapacity(bom.projectCapacity?.toString() || '30');
        setProfitRate(bom.profitRate?.toString() || '0');
        if (bom.notes) setNotes(bom.notes);

        if (bom.clientId) {
          const [client] = await db.select().from(clients).where(eq(clients.id, bom.clientId));
          if (client) setClientName(client.name);
        }
        const results = await db.select().from(bomItems).where(eq(bomItems.bomId, bomId));
        setItems(results.map(i => ({
          id: i.id,
          description: i.description,
          partNo: i.partNo || '',
          specifications: i.specifications || '',
          make: i.make || '',
          uom: i.uom || '',
          quantity: i.quantity.toString(),
          unitPrice: i.unitPrice.toString(),
          taxRate: i.taxRate?.toString() || '0',
          remark: i.remark || '',
        })));
      }
    } catch (e) { console.error(e); }
  };

  const filteredInventory = inventoryList.filter(item => 
    item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    (item.specifications && item.specifications.toLowerCase().includes(inventorySearch.toLowerCase())) ||
    (item.make && item.make.toLowerCase().includes(inventorySearch.toLowerCase()))
  );


  const addItem = () => {
    setItems([...items, { description: '', specifications: '', make: '', uom: '', quantity: '1', unitPrice: '0', taxRate: '0', remark: '' }]);
  };


  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof BOMItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const selectInventoryItem = (invItem: any) => {
    if (activeItemIndex !== null) {
      const newItems = [...items];
      newItems[activeItemIndex] = {
        ...newItems[activeItemIndex],
        description: invItem.name,
        partNo: invItem.partNo || '',
        specifications: invItem.specifications || '',
        make: invItem.make || '',
        uom: invItem.uom || '',
        unitPrice: invItem.price.toString(),
        taxRate: invItem.taxRate?.toString() || '0',
      };
      setItems(newItems);

    }
    setModalVisible(false);
  };

  const handleSave = async (isNewRevision = false) => {
    if (!projectName) return Alert.alert('Error', 'Project Name is required');

    const db = getDb();
    if (!db) return Alert.alert('Error', 'Database not ready');

    try {
      let clientId: number | null = null;
      if (clientName) {
        const [existing] = await db.select().from(clients).where(eq(clients.name, clientName));
        if (existing) clientId = existing.id;
        else {
          const [newC] = await db.insert(clients).values({ name: clientName }).returning({ id: clients.id });
          clientId = newC.id;
        }
      }

      const bomData = {
        projectName,
        clientId,
        date: new Date().toISOString(),
        revision: isNewRevision ? revision + 1 : revision,
        globalTaxRate: parseFloat(globalTaxRate) || 0,
        globalTaxAmount,
        projectCapacity: parseFloat(projectCapacity) || 30,
        profitRate: parseFloat(profitRate) || 0,
        totalCost: totalProjectCost,
        notes,
        status: 'Draft',

        parentId: isEditing ? (isNewRevision ? parseInt(id as string) : undefined) : undefined
      };



      let finalBomId: number;
      if (isEditing && !isNewRevision) {
        finalBomId = parseInt(id as string);
        await db.update(boms).set(bomData).where(eq(boms.id, finalBomId));
        await db.delete(bomItems).where(eq(bomItems.bomId, finalBomId));
      } else {
        const [newB] = await db.insert(boms).values(bomData as any).returning({ id: boms.id });
        finalBomId = newB.id;
      }

      const itemsToInsert = items.map(item => ({
        bomId: finalBomId,
        description: item.description || 'Material',
        partNo: item.partNo || null,
        specifications: item.specifications,
        make: item.make,
        uom: item.uom,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        taxRate: parseFloat(item.taxRate) || 0,
        total: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
        remark: item.remark,
      }));


      await db.insert(bomItems).values(itemsToInsert as any);
      Alert.alert('Success', `BOM ${isNewRevision ? 'Revision Created' : 'Saved'}!`);
      router.back();
    } catch (e) { console.error(e); }
  };

  const handleShare = async () => {
    try {
      const db = getDb();
      if (!db) return;

      const results = await db.select().from(businessProfile).limit(1);
      const profile = results[0];
      if (!profile) {
        Alert.alert('Error', 'Please set up your Business Profile first in Settings');
        return;
      }

      const html = generateBOMHtml(
        profile,
        { 
          projectName, 
          revision, 
          date, 
          totalCost: totalProjectCost, 
          globalTaxRate: parseFloat(globalTaxRate) || 0, 
          globalTaxAmount, 
          subtotal, 
          notes,
          projectCapacity: parseFloat(projectCapacity) || 30,
          profitRate: parseFloat(profitRate) || 0,
          totalBasicCost
        },
        items.map(i => ({
          description: i.description,
          specifications: i.specifications,
          make: i.make,
          uom: i.uom,
          quantity: parseFloat(i.quantity) || 0,
          unitPrice: parseFloat(i.unitPrice) || 0,
          taxRate: parseFloat(i.taxRate) || 0,
          total: (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
          remark: i.remark,
        }))
      );

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', 'Failed to generate BOM PDF: ' + e.message);
    }
  };


  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: isEditing ? `BOM Rev ${revision}` : 'New BOM' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project Name</Text>
          <TextInput 
            style={styles.input} 
            value={projectName} 
            onChangeText={setProjectName} 
            placeholder="e.g. 30 MWp Solar Project" 
            placeholderTextColor="#94a3b8"
          />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Client Name</Text>
          <TextInput 
            style={styles.input} 
            value={clientName} 
            onChangeText={setClientName} 
            placeholder="Enter client name" 
            placeholderTextColor="#94a3b8"
          />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bill of Materials</Text>
          </View>


          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <Text style={styles.itemCardTitle}>Material {index + 1}</Text>
                <View style={styles.itemCardActions}>
                  <TouchableOpacity onPress={() => { setActiveItemIndex(index); setModalVisible(true); }} style={[styles.addSmallButton, { marginRight: 8 }]}>
                    <Text style={styles.addSmallText}>Inventory</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeButton}>
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Material Name</Text>
                <TextInput 
                  style={styles.input} 
                  value={item.description} 
                  onChangeText={(v) => updateItem(index, 'description', v)} 
                  placeholder="Name" 
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Make</Text>
                  <TextInput 
                    style={styles.input} 
                    value={item.make} 
                    onChangeText={(v) => updateItem(index, 'make', v)} 
                    placeholder="Brand" 
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>UOM</Text>
                  <TextInput 
                    style={styles.input} 
                    value={item.uom} 
                    onChangeText={(v) => updateItem(index, 'uom', v)} 
                    placeholder="MWp/Nos" 
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Technical Specification</Text>
                <TextInput 
                  style={[styles.input, { height: 60 }]} 
                  value={item.specifications} 
                  onChangeText={(v) => updateItem(index, 'specifications', v)} 
                  multiline 
                  placeholder="Specs" 
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput 
                    style={styles.input} 
                    value={item.quantity} 
                    onChangeText={(v) => updateItem(index, 'quantity', v)} 
                    keyboardType="numeric" 
                    placeholder="0" 
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Unit Price</Text>
                  <TextInput 
                    style={styles.input} 
                    value={item.unitPrice} 
                    onChangeText={(v) => updateItem(index, 'unitPrice', v)} 
                    keyboardType="numeric" 
                    placeholder="0.00" 
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>GST (%)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={item.taxRate} 
                    onChangeText={(v) => updateItem(index, 'taxRate', v)} 
                    keyboardType="numeric" 
                    placeholder="0" 
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>


              <View style={styles.inputGroup}>
                <Text style={styles.label}>Remark</Text>
                <TextInput 
                  style={styles.input} 
                  value={item.remark} 
                  onChangeText={(v) => updateItem(index, 'remark', v)} 
                  placeholder="Additional notes..." 
                  placeholderTextColor="#94a3b8"
                />
              </View>
              </View>
            ))}


          <TouchableOpacity onPress={addItem} style={styles.addItemBottomButton}>
            <Plus size={20} color="#059669" />
            <Text style={styles.addItemBottomText}>Add Next Material</Text>
          </TouchableOpacity>
        </View>

        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Global Costing & Profit</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Capacity (MWp)</Text>
              <TextInput style={styles.input} value={projectCapacity} onChangeText={setProjectCapacity} keyboardType="numeric" placeholder="30" />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Profit (%)</Text>
              <TextInput style={styles.input} value={profitRate} onChangeText={setProfitRate} keyboardType="numeric" placeholder="0" />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Global GST (%) - Applied if item GST is 0</Text>
            <TextInput style={styles.input} value={globalTaxRate} onChangeText={setGlobalTaxRate} keyboardType="numeric" placeholder="0" />
          </View>
        </View>


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes & Exclusions</Text>
          <TextInput 
            style={[styles.input, { height: 150, textAlignVertical: 'top', marginTop: 10 }]} 
            value={notes} 
            onChangeText={setNotes} 
            multiline 
            placeholder="Terms, conditions, or exclusions..." 
          />
        </View>

        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Solar Project Cost</Text>
            <Text style={styles.summaryText}>₹{subtotal.toLocaleString()}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total GST</Text>
            <Text style={styles.summaryText}>₹{totalTax.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cost / Wp</Text>
            <Text style={styles.summaryText}>₹{costPerWp.toFixed(4)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Profit / Wp (@{profitRate}%)</Text>
            <Text style={styles.summaryText}>₹{profitPerWp.toFixed(4)}</Text>
          </View>

          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 8, marginTop: 4 }]}>
            <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Total Basic Cost / Wp</Text>
            <Text style={[styles.summaryText, { color: '#10B981' }]}>₹{basicCostPerWp.toFixed(4)}</Text>
          </View>

          <Text style={[styles.summaryLabel, { marginTop: 16, color: 'rgba(255,255,255,0.6)' }]}>Final Estimated Project Cost</Text>
          <Text style={styles.summaryValue}>₹{totalBasicCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        </View>


      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBarContainer}>
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={[styles.secondaryButton, { marginRight: 12 }]} 
            onPress={handleShare}
          >
            <Share2 color="#374151" size={24} />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} style={{ flex: 1 }} onPress={() => handleSave(false)}>
            <LinearGradient colors={['#059669', '#10B981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.actionButton, styles.primaryButtonGradient]}>
              <Save size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>{isEditing ? 'Update' : 'Save BOM'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>


      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Materials Inventory</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.closeModalText}>Close</Text></TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, spec or make..."
              value={inventorySearch}
              onChangeText={setInventorySearch}
            />
            {inventorySearch !== '' && (
              <TouchableOpacity onPress={() => setInventorySearch('')} style={styles.clearSearch}>
                <Text style={styles.clearSearchText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredInventory}
            keyExtractor={i => i.id.toString()}

            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.inventoryItemRow} onPress={() => selectInventoryItem(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inventoryItemName}>{item.name}</Text>
                  <Text style={styles.inventoryItemSpecs} numberOfLines={1}>{item.specifications || item.make || 'No specs'}</Text>
                </View>
                <Text style={styles.inventoryItemPrice}>₹{item.price}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { padding: 20, paddingBottom: 120 },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(229, 231, 235, 0.5)', elevation: 3,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, fontSize: 16, color: '#111827' },
  row: { flexDirection: 'row' },
  itemCard: { backgroundColor: '#F9FAFB', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  itemCardTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  itemCardActions: { flexDirection: 'row' },
  removeButton: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
  addSmallButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  addSmallText: { color: '#059669', fontWeight: '700', marginLeft: 6, fontSize: 12 },
  summarySection: { backgroundColor: '#111827', borderRadius: 24, padding: 24, alignItems: 'center' },
  summaryLabel: { color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', fontSize: 13, textTransform: 'uppercase' },
  summaryValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8 },
  summaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  bottomBarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },

  bottomBar: { padding: 16, flexDirection: 'row' },
  actionButton: { flex: 1, flexDirection: 'row', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryButtonGradient: { elevation: 6 },
  primaryButtonText: { color: '#FFF', fontWeight: '800', marginLeft: 8, fontSize: 16 },
  revisionButton: { backgroundColor: 'rgba(16, 185, 129, 0.1)', flex: 1 },
  revisionButtonText: { color: '#059669', fontWeight: '800', marginLeft: 4, fontSize: 14 },
  secondaryButton: { backgroundColor: '#F3F4F6', width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalContainer: { flex: 1, backgroundColor: '#FFF' },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  closeModalText: { color: '#10B981', fontWeight: '700' },
  inventoryItemRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  inventoryItemName: { fontSize: 16, fontWeight: '700' },
  inventoryItemSpecs: { fontSize: 12, color: '#6B7280' },
  inventoryItemPrice: { fontSize: 16, fontWeight: '800', color: '#10B981' },
  addItemBottomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addItemBottomText: {
    color: '#059669',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 15,
  },
  searchContainer: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  clearSearch: {
    marginLeft: 12,
  },
  clearSearchText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});

