import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

interface Partida { id: string; producto: string; cantidad: number; precioUnitario: number; descuentoAplicado: number; }
interface Invoice {
  id: string; folio: string; tipoDocumento: string;
  cliente: string; versionCFDI: string; estado: string; total: number; partidas: Partida[];
}

const mockInvoices: Invoice[] = [
  { id: '1', folio: 'FAC-2026-089', tipoDocumento: 'Factura', cliente: 'Panadería El Trigo S.A de C.V.', versionCFDI: 'CFDI v4.0', estado: 'Timbrada/Pagada', total: 12450.00, partidas: [
    { id: 'p1', producto: 'Harina Selecta 50kg', cantidad: 5, precioUnitario: 1200, descuentoAplicado: 10 },
    { id: 'p2', producto: 'Azúcar Refinada 25kg', cantidad: 2, precioUnitario: 800, descuentoAplicado: 0 },
  ]},
  { id: '2', folio: 'COT-2026-004', tipoDocumento: 'Prefactura/Cotización', cliente: 'Dulces La Estrella', versionCFDI: 'N/A', estado: 'En espera (Standby)', total: 5600.50, partidas: [
    { id: 'p4', producto: 'Colorante Rojo Caramelo', cantidad: 3, precioUnitario: 700, descuentoAplicado: 0 },
  ]},
  { id: '3', folio: 'FAC-2026-088', tipoDocumento: 'Factura', cliente: 'Bodega Aurrera - Sur', versionCFDI: 'CFDI v4.0', estado: 'Cancelada', total: 3200.00, partidas: [
    { id: 'p6', producto: 'Cajas de Cartón Corrugado', cantidad: 100, precioUnitario: 32, descuentoAplicado: 0 },
  ]},
  { id: '4', folio: 'NC-2026-012', tipoDocumento: 'Nota de Crédito', cliente: 'Panadería Rosa', versionCFDI: 'CFDI v4.0', estado: 'Timbrada/Pagada', total: -850.00, partidas: [
    { id: 'p7', producto: 'Devolución de Levadura', cantidad: 2, precioUnitario: 425, descuentoAplicado: 0 },
  ]},
  { id: '5', folio: 'COT-2026-005', tipoDocumento: 'Prefactura/Cotización', cliente: 'Restaurante El Cometa', versionCFDI: 'N/A', estado: 'En espera (Standby)', total: 18400.00, partidas: [
    { id: 'p8', producto: 'Aceite Vegetal 20L', cantidad: 10, precioUnitario: 850, descuentoAplicado: 5 },
  ]},
];

const getEstadoStyle = (estado: string) => {
  switch (estado) {
    case 'Timbrada/Pagada': return { bg: '#d1fae5', text: '#047857' };
    case 'En espera (Standby)': return { bg: '#f1f5f9', text: '#475569' };
    case 'Cancelada': return { bg: '#fee2e2', text: '#b91c1c' };
    default: return { bg: '#f1f5f9', text: '#475569' };
  }
};

const getTipoIcon = (tipo: string): 'file-text' | 'file' | 'file-minus' => {
  switch (tipo) {
    case 'Factura': return 'file-text';
    case 'Nota de Crédito': return 'file-minus';
    default: return 'file';
  }
};

const formatCurrency = (amount: number) => {
  const formatted = Math.abs(amount).toLocaleString('es-MX', { minimumFractionDigits: 2 });
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
};

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = mockInvoices.filter(inv =>
    inv.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.cliente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderItem = ({ item }: { item: Invoice }) => {
    const estado = getEstadoStyle(item.estado);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.folioRow}>
            <Feather name={getTipoIcon(item.tipoDocumento)} size={18} color="#15335c" />
            <View>
              <Text style={styles.folio}>{item.folio}</Text>
              <View style={[styles.tipoBadge, { backgroundColor: item.tipoDocumento === 'Factura' ? '#eff6ff' : '#f1f5f9' }]}>
                <Text style={[styles.tipoText, { color: item.tipoDocumento === 'Factura' ? '#15335c' : '#64748b' }]}>{item.tipoDocumento}</Text>
              </View>
            </View>
          </View>
          <View style={styles.totalCol}>
            <Text style={[styles.totalValue, item.total < 0 && { color: '#dc2626' }]}>{formatCurrency(item.total)}</Text>
            <View style={[styles.estadoBadge, { backgroundColor: estado.bg }]}>
              <Text style={[styles.estadoText, { color: estado.text }]}>{item.estado}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.clienteText} numberOfLines={1}>{item.cliente}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>CFDI</Text>
            <Text style={styles.valueLight}>{item.versionCFDI}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Partidas</Text>
            <Text style={styles.valueBold}>{item.partidas.length} {item.partidas.length === 1 ? 'partida' : 'partidas'}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Feather name="eye" size={16} color="#64748b" />
            <Text style={styles.actionText}>Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Feather name="file-text" size={16} color="#64748b" />
            <Text style={styles.actionText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Feather name="code" size={16} color="#64748b" />
            <Text style={styles.actionText}>XML</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Facturación</Text>
          <Text style={styles.headerSubtitle}>Comprobantes, cotizaciones y notas</Text>
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* KPIs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiContainer}>
        <View style={styles.kpiCard}><Feather name="trending-up" size={18} color="#15335c" /><View><Text style={styles.kpiLabel}>Ventas Mes</Text><Text style={styles.kpiValue}>$145,230</Text></View></View>
        <View style={styles.kpiCard}><Feather name="clock" size={18} color="#64748b" /><View><Text style={styles.kpiLabel}>En Espera</Text><Text style={styles.kpiValue}>12</Text></View></View>
        <View style={styles.kpiCard}><Feather name="check-circle" size={18} color="#10b981" /><View><Text style={styles.kpiLabel}>Timbrados</Text><Text style={styles.kpiValue}>89</Text></View></View>
      </ScrollView>

      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#94a3b8" />
        <TextInput style={styles.searchInput} placeholder="Buscar por folio o cliente..." placeholderTextColor="#94a3b8" value={searchTerm} onChangeText={setSearchTerm} />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No se encontraron documentos.</Text></View>}
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
  kpiCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#f1f5f9', minWidth: 140 },
  kpiLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  kpiValue: { fontSize: 16, fontWeight: '800', color: '#1e293b' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', marginLeft: 10 },

  listContainer: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },

  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  folioRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  folio: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  tipoBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  tipoText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalCol: { alignItems: 'flex-end', gap: 4 },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  estadoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  estadoText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  cardBody: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  clienteText: { fontSize: 13, fontWeight: '700', color: '#0f2744', flex: 1, textAlign: 'right', marginLeft: 12 },
  valueLight: { fontSize: 12, color: '#64748b' },
  valueBold: { fontSize: 13, fontWeight: '700', color: '#1e293b' },

  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#64748b' },

  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
});
