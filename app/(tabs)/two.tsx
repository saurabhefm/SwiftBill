import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, View, Text } from 'react-native';
import { db } from '@/src/db/client';
import { businessProfile } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { Save, User, Building, Landmark, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function SettingsScreen() {
  const [profile, setProfile] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    bankName: '',
    bankAccount: '',
    currency: '₹',
    invoicePrefix: 'INV',
    logoUri: '',
  });
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const result = await db.query.businessProfile.findFirst();
      if (result) {
        setProfile({
          name: result.name || '',
          address: result.address || '',
          phone: result.phone || '',
          email: result.email || '',
          bankName: result.bankName || '',
          bankAccount: result.bankAccount || '',
          currency: result.currency || '₹',
          invoicePrefix: result.invoicePrefix || 'INV',
          logoUri: result.logoUri || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSave = async () => {
    try {
      await db.update(businessProfile)
        .set(profile)
        .where(eq(businessProfile.id, 1));
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setProfile({ ...profile, logoUri: result.assets[0].uri });
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Building size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Business Profile</Text>
          </View>
          
          <TouchableOpacity style={styles.logoPicker} onPress={pickImage}>
            {profile.logoUri ? (
              <Image source={{ uri: profile.logoUri }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <ImageIcon size={32} color="#9CA3AF" />
                <Text style={styles.logoText}>Add Logo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name</Text>
            <TextInput
              style={styles.input}
              value={profile.name}
              onChangeText={(v) => setProfile({ ...profile, name: v })}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, { height: 60 }]}
              value={profile.address}
              onChangeText={(v) => setProfile({ ...profile, address: v })}
              multiline
            />
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={profile.phone}
                onChangeText={(v) => setProfile({ ...profile, phone: v })}
                keyboardType="phone-pad"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={profile.email}
                onChangeText={(v) => setProfile({ ...profile, email: v })}
                keyboardType="email-address"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Landmark size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>Payment Details</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bank Name</Text>
            <TextInput
              style={styles.input}
              value={profile.bankName}
              onChangeText={(v) => setProfile({ ...profile, bankName: v })}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Number / Details</Text>
            <TextInput
              style={styles.input}
              value={profile.bankAccount}
              onChangeText={(v) => setProfile({ ...profile, bankAccount: v })}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SettingsIcon size={20} color="#2563EB" />
            <Text style={styles.sectionTitle}>App Preferences</Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Currency Symbol</Text>
              <TextInput
                style={styles.input}
                value={profile.currency}
                onChangeText={(v) => setProfile({ ...profile, currency: v })}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Invoice Prefix</Text>
              <TextInput
                style={styles.input}
                value={profile.invoicePrefix}
                onChangeText={(v) => setProfile({ ...profile, invoicePrefix: v })}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={handleSave}>
          <LinearGradient
            colors={['#4F46E5', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButtonGradient}
          >
            <Save size={20} color="#FFF" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Reuse styles or similar theme
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginLeft: 10,
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
  logoPicker: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  logoPlaceholder: {
    width: 140,
    height: 90,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 140,
    height: 90,
    borderRadius: 16,
  },
  logoText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
    marginTop: 8,
  },
  saveButtonGradient: {
    height: 60,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 10,
  },
});
import { Settings as SettingsIcon } from 'lucide-react-native';
