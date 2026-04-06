import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

interface PriceList {
  id: string; name: string; currency: string; rule: string; activeClients: number;
}

const mockPrices: PriceList[] = [
  { id: '1', name: 'Público General', currency: 'MXN - Pesos Mexicanos', rule: 'Precio Base', activeClients: 124 },
  { id: '2', name: 'Mayoreo Nivel 1', currency: 'MXN - Pesos Mexicanos', rule: '-10% sobre base', activeClients: 45 },
  { id: '3', name: 'Especial Franquicias', currency: 'MXN - Pesos Mexicanos', rule: '-15% sobre base + Envío Gratis', activeClients: 8 },
  { id: '4', name: 'Exportación USA', currency: 'USD - Dólares', rule: 'Precio Especial USD', activeClients: 3 },
];

export default function Prices() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = mockPrices.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.currency.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalClients = mockPrices.reduce((acc, curr) => acc + curr.activeClients, 0);

  const renderItem = ({ item }: { item: PriceList }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>
          <Feather name="tag" size={18} color="#15335c" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyText}>{item.currency}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Text style={styles.label}>Regla/Margen</Text>
          <View style={styles.ruleRow}>
            <Feather name="percent" size={12} color="#15335c" />
            <Text style={styles.ruleText}>{item.rule}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Clientes Activos</Text>
          <View style={styles.clientsBadge}>
            <Feather name="users" size={12} color="#15335c" />
            <Text style={styles.clientsCount}>{item.activeClients}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn}>
          <Feather name="edit-2" size={16} color="#64748b" />
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Feather name="package" size={16} color="#64748b" />
          <Text style={styles.actionText}>Productos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Listas de Precios</Text>
          <Text style={styles.headerSubtitle}>Configura reglas de precios y monedas</Text>
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* KPIs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiContainer}>
        <View style={styles.kpiCard}><Feather name="list" size={18} color="#15335c" /><View><Text style={styles.kpiLabel}>Total Listas</Text><Text style={styles.kpiValue}>{mockPrices.length}</Text></View></View>
        <View style={styles.kpiCard}><Feather name="dollar-sign" size={18} color="#10b981" /><View><Text style={styles.kpiLabel}>Moneda</Text><Text style={styles.kpiValue}>MXN</Text></View></View>
        <View style={styles.kpiCard}><Feather name="users" size={18} color="#e11d48" /><View><Text style={styles.kpiLabel}>Clientes</Text><Text style={styles.kpiValue}>{totalClients}</Text></View></View>
      </ScrollView>

      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#94a3b8" />
        <TextInput style={styles.searchInput} placeholder="Buscar por nombre de lista o moneda..." placeholderTextColor="#94a3b8" value={searchTerm} onChangeText={setSearchTerm} />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No se encontraron listas de precios.</Text></View>}
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

  kpiContainer: { paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  kpiCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#f1f5f9', minWidth: 130 },
  kpiLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  kpiValue: { fontSize: 16, fontWeight: '800', color: '#1e293b' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', marginLeft: 10 },

  listContainer: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },

  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f2744' },
  currencyBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  currencyText: { fontSize: 10, fontWeight: '700', color: '#64748b' },

  cardBody: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ruleText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  clientsBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  clientsCount: { fontSize: 12, fontWeight: '800', color: '#0f2744' },

  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#64748b' },

  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
});
