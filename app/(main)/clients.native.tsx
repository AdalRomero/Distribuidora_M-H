import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

interface ClientItem {
  id: string; rfc: string; name: string; category: 'Panadería' | 'Dulcería' | 'General';
  priceList: string; status: 'Activo' | 'Inactivo';
}

const mockClients: ClientItem[] = [
  { id: '1', rfc: 'PELT901012A12', name: 'Panadería El Trigo', category: 'Panadería', priceList: 'Mayoreo Nivel 1', status: 'Activo' },
  { id: '2', rfc: 'DLEST850210XYZ', name: 'Dulces La Estrella', category: 'Dulcería', priceList: 'Especial Franquicias', status: 'Activo' },
  { id: '3', rfc: 'ABAD980512HQ1', name: 'Abarrotes Don Pepe', category: 'General', priceList: 'Público General', status: 'Inactivo' },
  { id: '4', rfc: 'PANR880614WW2', name: 'Panadería Rosa', category: 'Panadería', priceList: 'Público General', status: 'Activo' },
  { id: '5', rfc: 'CARA010815TTT', name: 'Caramelos y Más', category: 'Dulcería', priceList: 'Mayoreo Nivel 1', status: 'Activo' },
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Panadería': return { bg: '#eff6ff', text: '#0f2744' };
    case 'Dulcería': return { bg: '#fce7f3', text: '#e11d48' };
    default: return { bg: '#f1f5f9', text: '#475569' };
  }
};

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = mockClients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.rfc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderItem = ({ item }: { item: ClientItem }) => {
    const catColor = getCategoryColor(item.category);
    const isActive = item.status === 'Activo';
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name[0]}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.clientName}>{item.name}</Text>
            <Text style={styles.clientRfc}>{item.rfc}</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn}>
            <Feather name="more-vertical" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.label}>Categoría</Text>
            <View style={[styles.badge, { backgroundColor: catColor.bg }]}>
              <Text style={[styles.badgeText, { color: catColor.text }]}>{item.category}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Lista Asignada</Text>
            <View style={styles.priceListRow}>
              <Feather name="tag" size={12} color="#15335c" />
              <Text style={styles.priceListText}>{item.priceList}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Estado</Text>
            <View style={[styles.statusBadge, { backgroundColor: isActive ? '#d1fae5' : '#fee2e2' }]}>
              <View style={[styles.statusDot, { backgroundColor: isActive ? '#10b981' : '#ef4444' }]} />
              <Text style={[styles.statusText, { color: isActive ? '#047857' : '#b91c1c' }]}>{item.status}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Directorio de Clientes</Text>
          <Text style={styles.headerSubtitle}>Administra la información de tus clientes</Text>
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o RFC..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No se encontraron clientes.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f2744' },
  headerSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16,
    borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: '#f1f5f9',
    marginBottom: 10, marginTop: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', marginLeft: 10 },

  listContainer: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#f1f5f9', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe' },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#15335c' },
  cardInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '800', color: '#0f2744' },
  clientRfc: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  moreBtn: { padding: 6 },

  cardBody: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  priceListRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceListText: { fontSize: 12, fontWeight: '600', color: '#334155' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
});
