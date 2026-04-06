import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

interface InventoryItem {
  id: string; name: string; internalCode: string; family: string;
  marginCategory: string; averageCost: number; hasIva: boolean; hasIeps: boolean;
  stock: number; unit: string; expirationDate: string; warehouse: string; batch: string;
}

const mockInventory: InventoryItem[] = [
  { id: '1', name: 'Harina Selecta Alta Proteína 25kg', internalCode: 'Cód: 14-001', family: 'Harinas', marginCategory: 'Margen Ideal', averageCost: 450, hasIva: false, hasIeps: false, batch: 'L-2026-03A', warehouse: 'Bodega Central', stock: 150, unit: 'bultos', expirationDate: '2026-12-01' },
  { id: '2', name: 'Colorante Rojo Red Velvet 1L', internalCode: 'Cód: 14-045', family: 'Colorantes', marginCategory: 'Margen Alto', averageCost: 280, hasIva: true, hasIeps: true, batch: 'L-2025-08B', warehouse: 'Estante A', stock: 15, unit: 'litros', expirationDate: '2026-08-15' },
  { id: '3', name: 'Saborizante Vainilla Oscura 4L', internalCode: 'Cód: 14-082', family: 'Saborizantes', marginCategory: 'De Servicio', averageCost: 120, hasIva: true, hasIeps: false, batch: 'L-2025-11C', warehouse: 'Estante B', stock: 8, unit: 'galones', expirationDate: '2024-11-20' },
  { id: '4', name: 'Cobertura Semiamarga Chispas 5kg', internalCode: 'Cód: 14-110', family: 'Chocolates', marginCategory: 'Margen Ideal', averageCost: 650, hasIva: true, hasIeps: true, batch: 'L-2026-01D', warehouse: 'Bodega Fría', stock: 40, unit: 'cajas', expirationDate: '2026-05-30' },
  { id: '5', name: 'Levadura Seca Instantánea 500g', internalCode: 'Cód: 14-005', family: 'Levaduras', marginCategory: 'Margen Bajo', averageCost: 85, hasIva: false, hasIeps: false, batch: 'L-2026-06E', warehouse: 'Bodega Central', stock: 3, unit: 'pzas', expirationDate: '2026-06-12' },
];

const getMarginColor = (category: string) => {
  switch (category) {
    case 'Margen Ideal': return { bg: '#d1fae5', text: '#047857' };
    case 'Margen Alto': return { bg: '#ede9fe', text: '#6d28d9' };
    case 'De Servicio': return { bg: '#f1f5f9', text: '#475569' };
    default: return { bg: '#ffedd5', text: '#c2410c' };
  }
};

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = mockInventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.internalCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLowStock = (stock: number) => stock <= 10;

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const margin = getMarginColor(item.marginCategory);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <Feather name="package" size={18} color="#94a3b8" />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.cardCode}>{item.internalCode}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Familia</Text>
            <Text style={styles.cardValueBold}>{item.family}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Margen</Text>
            <View style={[styles.badge, { backgroundColor: margin.bg }]}>
              <Text style={[styles.badgeText, { color: margin.text }]}>{item.marginCategory}</Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Costo Prom.</Text>
            <Text style={styles.cardValueBold}>${item.averageCost.toFixed(2)}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Impuestos</Text>
            <View style={styles.taxRow}>
              {item.hasIva && <View style={styles.taxBadge}><Text style={styles.taxText}>IVA</Text></View>}
              {item.hasIeps && <View style={[styles.taxBadge, { backgroundColor: '#f3e8ff' }]}><Text style={[styles.taxText, { color: '#7c3aed' }]}>IEPS</Text></View>}
              {!item.hasIva && !item.hasIeps && <Text style={styles.cardValueLight}>Excento</Text>}
            </View>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Stock</Text>
            <Text style={[styles.cardValueBold, isLowStock(item.stock) && { color: '#d97706' }]}>
              {item.stock} {item.unit}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Ubicación</Text>
            <Text style={styles.cardValueLight}>{item.warehouse}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Lote</Text>
            <Text style={styles.cardValueLight}>{item.batch}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Caducidad</Text>
            <View style={styles.expiryRow}>
              <Feather name="clock" size={12} color="#94a3b8" />
              <Text style={styles.cardValueLight}>{item.expirationDate}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventario de Productos</Text>
        <Text style={styles.headerSubtitle}>Gestiona tu catálogo de distribución</Text>
      </View>

      {/* KPIs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Feather name="box" size={20} color="#2563eb" />
          <View><Text style={styles.kpiLabel}>Valor Stock</Text><Text style={styles.kpiValue}>$142,500</Text></View>
        </View>
        <View style={styles.kpiCard}>
          <Feather name="dollar-sign" size={20} color="#10b981" />
          <View><Text style={styles.kpiLabel}>Costo Stock</Text><Text style={styles.kpiValue}>$98,240</Text></View>
        </View>
        <View style={styles.kpiCard}>
          <Feather name="alert-triangle" size={20} color="#f59e0b" />
          <View><Text style={styles.kpiLabel}>Stock Bajo</Text><Text style={[styles.kpiValue, { color: '#d97706' }]}>12</Text></View>
        </View>
        <View style={styles.kpiCard}>
          <Feather name="clock" size={20} color="#ef4444" />
          <View><Text style={styles.kpiLabel}>Por Caducar</Text><Text style={[styles.kpiValue, { color: '#dc2626' }]}>5</Text></View>
        </View>
      </ScrollView>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por código, nombre o lote..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No se encontraron productos.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  headerSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },

  kpiContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  kpiCard: {
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#f1f5f9',
    minWidth: 150,
  },
  kpiLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  kpiValue: { fontSize: 18, fontWeight: '800', color: '#1e293b' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16,
    borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: '#f1f5f9',
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', marginLeft: 10 },

  listContainer: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  cardIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  cardCode: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  cardBody: { padding: 16, gap: 10 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  cardValueBold: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  cardValueLight: { fontSize: 12, color: '#64748b' },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  taxRow: { flexDirection: 'row', gap: 4 },
  taxBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  taxText: { fontSize: 9, fontWeight: '800', color: '#2563eb' },

  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
});
