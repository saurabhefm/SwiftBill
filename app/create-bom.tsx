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
import { GROUND_MOUNTED_30MWP_PRESET, ALL_MATERIALS_PRESET } from '@/src/constants/presets';

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
  isTaxEnabled?: boolean;
  remark: string;
}


export default function CreateBOMScreen() {
  const { id, presetCapacity, allMaterials, newProjectName } = useLocalSearchParams();
  const isEditing = !!id;

  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [date, setDate] = useState(new Date().toISOString());
  const [revision, setRevision] = useState(0);
  const [globalTaxRate, setGlobalTaxRate] = useState('0');
  const [projectCapacity, setProjectCapacity] = useState('30');
  const [profitRate, setProfitRate] = useState('0');
  const [contingencyRate, setContingencyRate] = useState('0');
  const [isItemTaxEnabled, setIsItemTaxEnabled] = useState(true);
  const [inventorySearch, setInventorySearch] = useState('');
  const [notes, setNotes] = useState('Above Pricing is inclusive of supply of above material & installation but excluding the following:\n1. CCTV Surveillance System charges shall be extra\n2. Project insurance shall be in client scope\n3. Temporary electricity connection during construction period shall be client responsibility\n4. Tax shall be extra as actual\n5. Boundary Fencing shall be in client scope\n6. Local issue shall be takencare by client\n7. Extra material shall be taken by Solveig solar pvt ltd\n8. Full-time service support for a period of 3 months from date of commissioning\n9. Defect liability period is not applicable');


  const defaultEmptyItem = { description: '', specifications: '', make: '', uom: '', quantity: '1', unitPrice: '0', taxRate: '0', isTaxEnabled: true, remark: '' };
  const [items, setItems] = useState<BOMItem[]>([
    { ...defaultEmptyItem },
    { ...defaultEmptyItem },
    { ...defaultEmptyItem },
    { ...defaultEmptyItem },
    { ...defaultEmptyItem }
  ]);


  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  const toggleAllTaxes = () => {
    const newState = !isItemTaxEnabled;
    setIsItemTaxEnabled(newState);
    setItems(items.map(item => ({ ...item, isTaxEnabled: newState })));
  };

  const subtotal = items.reduce((acc, item) => {
    return acc + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
  }, 0);

  const itemTaxes = items.reduce((acc, item) => {
    if (item.isTaxEnabled === false) return acc;
    const rate = parseFloat(item.taxRate) || 0;
    if (rate > 0) {
      return acc + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0) * (rate / 100);
    }
    return acc;
  }, 0);

  const globalTaxBasis = items.reduce((acc, item) => {
    if (item.isTaxEnabled === false) return acc;
    const rate = parseFloat(item.taxRate) || 0;
    if (rate === 0) {
      return acc + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
    }
    return acc;
  }, 0);

  const globalTaxAmount = (globalTaxBasis * (parseFloat(globalTaxRate) || 0)) / 100;
  const totalTax = itemTaxes + globalTaxAmount;
  const totalProjectCost = subtotal + totalTax;
  
  const contingencyAmount = parseFloat(contingencyRate) || 0;
  const profitAmount = parseFloat(profitRate) || 0;
  const totalBasicCost = totalProjectCost + profitAmount + contingencyAmount;
  
  const capacityInWp = (parseFloat(projectCapacity) || 1) * 1000000;
  const costPerWp = totalProjectCost / capacityInWp;
  const profitPerWp = profitAmount / capacityInWp;
  const basicCostPerWp = totalBasicCost / capacityInWp;



  useEffect(() => {
    if (isEditing) {
      loadBOM();
    } else if (presetCapacity) {
      loadPreset(parseFloat(presetCapacity as string), newProjectName as string);
    } else if (allMaterials) {
      loadAllMaterialsPreset(newProjectName as string);
    } else if (newProjectName) {
      setProjectName(newProjectName as string);
    }
    loadInventory();
  }, [id, presetCapacity, allMaterials, newProjectName]);

  const loadPreset = (capacity: number, name?: string) => {
    if (isNaN(capacity) || capacity <= 0) return;
    
    setProjectCapacity(capacity.toString());
    
    const presetItems: BOMItem[] = GROUND_MOUNTED_30MWP_PRESET.map(item => {
      const scaledQty = item.qtyPerMWp * capacity;
      const roundedQty = Math.round(scaledQty * 1000) / 1000;
      
      return {
        description: item.description,
        specifications: item.specifications,
        make: item.make,
        uom: item.uom,
        quantity: roundedQty.toString(),
        unitPrice: item.unitPrice.toString(),
        taxRate: item.taxRate.toString(),
        remark: item.remark
      };
    });
    
    setItems(presetItems);
    setProjectName(name || `${capacity} MWp Solar Project`);
  };

  const loadAllMaterialsPreset = (name?: string) => {
    const presetItems: BOMItem[] = ALL_MATERIALS_PRESET.map(item => ({
      ...defaultEmptyItem,
      description: item.description,
      make: item.make,
      quantity: '0',
    }));
    setItems(presetItems);
    setProjectName(name || `New Solar Project`);
  };

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
        setContingencyRate(bom.contingencyRate?.toString() || '0');
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
          isTaxEnabled: i.isTaxEnabled === 1,
          remark: i.remark || '',
        })));
        setIsItemTaxEnabled(results.length === 0 || results[0].isTaxEnabled === 1);
      }
    } catch (e) { console.error(e); }
  };

  const filteredInventory = inventoryList.filter(item => 
    item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    (item.specifications && item.specifications.toLowerCase().includes(inventorySearch.toLowerCase())) ||
    (item.make && item.make.toLowerCase().includes(inventorySearch.toLowerCase()))
  );


  const addItem = () => {
    setItems([...items, { ...defaultEmptyItem }]);
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
        contingencyRate: parseFloat(contingencyRate) || 0,
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
          totalBasicCost,
          isItemTaxEnabled
        },
        items.filter(i => (parseFloat(i.quantity) || 0) > 0).map(i => ({
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
          <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
            <Text style={styles.sectionTitle}>Bill of Materials</Text>
          </View>

          <View style={{ flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' }}>
            {/* Frozen Left Columns */}
            <View style={{ borderRightWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#FFF', zIndex: 1, elevation: 1 }}>
              <View style={[styles.tableHeaderRow, { height: 36, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }]}>
                <Text style={[styles.tableHeaderCell, { width: 40, textAlign: 'center' }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { width: 200, borderRightWidth: 0 }]}>Material Name</Text>
              </View>
              {items.map((item, index) => (
                <View key={`frozen-${index}`} style={[styles.tableRow, { height: 44, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFF' }]}>
                  <Text style={[styles.tableCellText, { width: 40, textAlign: 'center', fontWeight: '600', color: '#6B7280', height: 44, paddingTop: 14 }]}>{index + 1}</Text>
                  <TextInput style={[styles.tableInput, { width: 200, borderRightWidth: 0, height: 44 }]} value={item.description} onChangeText={(v) => updateItem(index, 'description', v)} placeholder="Name" />
                </View>
              ))}
              <View style={{ height: 36, backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#E5E7EB' }} />
            </View>

            {/* Scrollable Right Columns */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true} persistentScrollbar={true} style={{ flex: 1 }}>
              <View>
                <View style={[styles.tableHeaderRow, { height: 36, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }]}>
                  <Text style={[styles.tableHeaderCell, { width: 100 }]}>Make</Text>
                  <Text style={[styles.tableHeaderCell, { width: 80 }]}>UOM</Text>
                  <Text style={[styles.tableHeaderCell, { width: 180 }]}>Specifications</Text>
                  <Text style={[styles.tableHeaderCell, { width: 60 }]}>Qty</Text>
                  <Text style={[styles.tableHeaderCell, { width: 90 }]}>Price</Text>
                  <Text style={[styles.tableHeaderCell, { width: 60 }]}>GST %</Text>
                  <Text style={[styles.tableHeaderCell, { width: 120 }]}>Remark</Text>
                  <Text style={[styles.tableHeaderCell, { width: 80, borderRightWidth: 0, textAlign: 'center' }]}>Actions</Text>
                </View>

                {items.map((item, index) => (
                  <View key={`scroll-${index}`} style={[styles.tableRow, { height: 44, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFF' }]}>
                    <TextInput style={[styles.tableInput, { width: 100, height: 44 }]} value={item.make} onChangeText={(v) => updateItem(index, 'make', v)} placeholder="Make" />
                    <TextInput style={[styles.tableInput, { width: 80, height: 44 }]} value={item.uom} onChangeText={(v) => updateItem(index, 'uom', v)} placeholder="UOM" />
                    <TextInput style={[styles.tableInput, { width: 180, height: 44 }]} value={item.specifications} onChangeText={(v) => updateItem(index, 'specifications', v)} placeholder="Specs" />
                    <TextInput style={[styles.tableInput, { width: 60, height: 44 }]} value={item.quantity} onChangeText={(v) => updateItem(index, 'quantity', v)} keyboardType="numeric" />
                    <TextInput style={[styles.tableInput, { width: 90, height: 44 }]} value={item.unitPrice} onChangeText={(v) => updateItem(index, 'unitPrice', v)} keyboardType="numeric" />
                    <TextInput style={[styles.tableInput, { width: 60, height: 44 }]} value={item.taxRate} onChangeText={(v) => updateItem(index, 'taxRate', v)} keyboardType="numeric" editable={isItemTaxEnabled} />
                    <TextInput style={[styles.tableInput, { width: 120, height: 44, borderRightWidth: 0 }]} value={item.remark} onChangeText={(v) => updateItem(index, 'remark', v)} placeholder="Remark" />
                    <View style={[styles.tableActionCell, { width: 80, height: 44 }]}>
                      <TouchableOpacity onPress={() => { setActiveItemIndex(index); setModalVisible(true); }} style={styles.tableIconBtn}>
                        <Plus size={16} color="#059669" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeItem(index)} style={styles.tableIconBtn}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <View style={{ height: 36, backgroundColor: '#F9FAFB', borderTopWidth: 1, borderTopColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                  <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 'bold', letterSpacing: 1 }}>◀  SWIPE HERE TO SCROLL HORIZONTALLY  ▶</Text>
                </View>
              </View>
            </ScrollView>
          </View>

          <TouchableOpacity onPress={addItem} style={[styles.addItemBottomButton, { marginTop: 12 }]}>
            <Plus size={16} color="#059669" />
            <Text style={styles.addItemBottomText}>Add Row</Text>
          </TouchableOpacity>
        </View>

        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Global Costing & Profit</Text>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Capacity (MWp)</Text>
              <TextInput style={styles.input} value={projectCapacity} onChangeText={setProjectCapacity} keyboardType="numeric" placeholder="30" />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Profit (₹)</Text>
              <TextInput style={styles.input} value={profitRate} onChangeText={setProfitRate} keyboardType="numeric" placeholder="0" />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Contingency (₹)</Text>
              <TextInput style={styles.input} value={contingencyRate} onChangeText={setContingencyRate} keyboardType="numeric" placeholder="0" />
            </View>
          </View>
          <View style={[styles.inputGroup, { marginTop: 8 }]}>
            <Text style={styles.label}>Global Tax Options</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.label, { fontSize: 10, color: '#9CA3AF' }]}>Global GST (%)</Text>
                <TextInput style={styles.input} value={globalTaxRate} onChangeText={setGlobalTaxRate} keyboardType="numeric" placeholder="0" />
              </View>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={toggleAllTaxes} 
                style={{ 
                  flex: 1, 
                  paddingVertical: 14, 
                  borderRadius: 12, 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backgroundColor: isItemTaxEnabled ? '#D1FAE5' : '#F3F4F6', 
                  borderWidth: 1, 
                  borderColor: isItemTaxEnabled ? '#10B981' : '#D1D5DB' 
                }}
              >
                <Text style={{ color: isItemTaxEnabled ? '#059669' : '#6B7280', fontWeight: 'bold', fontSize: 13 }}>
                  {isItemTaxEnabled ? 'Item GST: ON' : 'Item GST: OFF'}
                </Text>
              </TouchableOpacity>
            </View>
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
            <Text style={styles.summaryLabel}>Profit / Wp</Text>
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

          {isEditing && (
            <TouchableOpacity activeOpacity={0.8} style={[styles.secondaryButton, { flex: 1, marginRight: 12, backgroundColor: '#ECFDF5', borderColor: '#10B981', borderWidth: 1 }]} onPress={() => handleSave(true)}>
              <Text style={{ color: '#059669', fontWeight: 'bold', fontSize: 14 }}>Save as Rev {revision + 1}</Text>
            </TouchableOpacity>
          )}

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
  tableContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
  },
  tableHeaderCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    borderRightWidth: 1,
    borderRightColor: '#D1D5DB',
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tableCellText: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#374151',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  tableInput: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#111827',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    height: 44,
    backgroundColor: 'transparent',
  },
  tableActionCell: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    height: 44,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  tableIconBtn: {
    padding: 6,
  },
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

