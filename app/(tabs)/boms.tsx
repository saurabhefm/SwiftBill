import React, { useState, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Text, Alert, Modal, TextInput } from 'react-native';
import { getDb } from '@/src/db/client';
import { boms, clients, businessProfile } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Plus, ChevronRight, History, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { format } from 'date-fns';

export default function BOMListScreen() {
  const [projectList, setProjectList] = useState<any[]>([]);
  const [presetModalVisible, setPresetModalVisible] = useState(false);
  const [presetCapacity, setPresetCapacity] = useState('');
  const insets = useSafeAreaInsets();

  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [newProjectModalVisible, setNewProjectModalVisible] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const fetchBOMs = async () => {
    try {
      const db = getDb();
      if (!db) return;
      const results = await db.select({
        id: boms.id,
        projectName: boms.projectName,
        date: boms.date,
        revision: boms.revision,
        totalCost: boms.totalCost,
        status: boms.status,
        clientName: clients.name,
      })
      .from(boms)
      .leftJoin(clients, eq(boms.clientId, clients.id))
      .orderBy(desc(boms.date), desc(boms.revision));
      
      setProjectList(results);
    } catch (error) {
      console.error('Error fetching BOMs:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBOMs();
    }, [])
  );

  const handleDelete = (id: number) => {
    Alert.alert('Delete BOM', 'Are you sure you want to delete this BOM revision?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const db = getDb();
          await db.delete(boms).where(eq(boms.id, id));
          fetchBOMs();
        } catch (error) {
          console.error('Error deleting BOM:', error);
        }
      }},
    ]);
  };

  const handleProjectOptions = (pName: string) => {
    Alert.alert('Create BOM for ' + pName, 'How would you like to start?', [
      { text: 'Manual Entry', onPress: () => router.push({ pathname: '/create-bom', params: { newProjectName: pName } }) },
      { text: 'Use 30MWp Preset Logic', onPress: () => setPresetModalVisible(true) },
      { text: 'Create BOM with all material', onPress: () => router.push({ pathname: '/create-bom', params: { newProjectName: pName, allMaterials: 'true' } }) },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const handleCreateNew = () => {
    setNewProjectName('');
    setNewProjectModalVisible(true);
  };

  const groupedProjects = projectList.reduce((acc: any[], current: any) => {
    const existing = acc.find((p: any) => p.projectName === current.projectName);
    if (existing) {
      existing.revisions.push(current);
    } else {
      acc.push({
        projectName: current.projectName,
        clientName: current.clientName,
        revisions: [current]
      });
    }
    return acc;
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#059669', '#10B981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 20 }]}
      >
        <View>
          <Text style={styles.title}>BOM & Projects</Text>
          <Text style={styles.subtitle}>Material lists & Costing</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={handleCreateNew}
          activeOpacity={0.8}
        >
          <Plus color="#10B981" size={24} />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={groupedProjects}
        keyExtractor={item => item.projectName}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.cardHeader}
              onPress={() => setExpandedProject(expandedProject === item.projectName ? null : item.projectName)}
            >
              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{item.projectName}</Text>
                <Text style={styles.clientName}>{item.clientName || 'No Client'} • {item.revisions.length} Revisions</Text>
              </View>
              <View style={styles.viewButton}>
                <ChevronRight color="#FFF" size={20} style={{ transform: [{ rotate: expandedProject === item.projectName ? '90deg' : '0deg' }] }} />
              </View>
            </TouchableOpacity>

            {expandedProject === item.projectName && (
              <View style={styles.revisionsContainer}>
                {item.revisions.map((rev: any) => (
                  <TouchableOpacity 
                    key={rev.id}
                    style={styles.revisionRow}
                    onPress={() => router.push({ pathname: '/create-bom', params: { id: rev.id } })}
                  >
                    <View style={styles.revisionInfo}>
                      <View style={styles.revisionBadge}>
                        <History size={12} color="#059669" style={{ marginRight: 4 }} />
                        <Text style={styles.revisionText}>Rev {rev.revision}</Text>
                      </View>
                      <Text style={styles.dateText}>{format(new Date(rev.date), 'dd MMM yy')}</Text>
                    </View>
                    
                    <View style={styles.revisionActions}>
                      <Text style={styles.totalValue}>₹{rev.totalCost.toLocaleString()}</Text>
                      <TouchableOpacity onPress={() => handleDelete(rev.id)} style={[styles.deleteButton, { marginLeft: 12 }]}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No Projects found. Create your first project!</Text>
          </View>
        }
      />

      <Modal visible={newProjectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Project</Text>
            <Text style={styles.modalSubtitle}>Enter the project name to get started.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Project Name"
              value={newProjectName}
              onChangeText={setNewProjectName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setNewProjectModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={() => {
                if (newProjectName.trim() === '') return Alert.alert('Error', 'Project name required');
                setNewProjectModalVisible(false);
                handleProjectOptions(newProjectName);
              }}>
                <Text style={styles.modalConfirmText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={presetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Project Capacity</Text>
            <Text style={styles.modalSubtitle}>Enter the size in MWp to scale the materials automatically.</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="e.g. 5"
              value={presetCapacity}
              onChangeText={setPresetCapacity}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPresetModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={() => {
                setPresetModalVisible(false);
                router.push({ pathname: '/create-bom', params: { presetCapacity, newProjectName } });
              }}>
                <Text style={styles.modalConfirmText}>Generate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#FFFFFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revisionsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  revisionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  revisionInfo: {
    flex: 1,
  },
  revisionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  clientName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  revisionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  revisionText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    marginRight: 8,
  },
  viewButton: {
    backgroundColor: '#10B981',
    padding: 10,
    borderRadius: 12,
  },
  emptyState: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#111827',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    padding: 12,
    marginRight: 8,
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 16,
  },
  modalConfirmBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalConfirmText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
