import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const MH_BLUE = '#15335c';

const summaryStats = [
  { title: 'Aceptados', value: '2,340', icon: 'check-circle' as const, color: '#10b981', bgColor: '#d1fae5' },
  { title: 'En Contrato', value: '1,120', icon: 'file-text' as const, color: '#85a3bf', bgColor: '#e6edf4' },
  { title: 'Pendientes', value: '450', icon: 'clock' as const, color: '#f59e0b', bgColor: '#fef3c7' },
];

const contractsData = [
  { serial: 'CON-2023-001', name: 'Cornejo', value: '$45,000', status: 'Aceptado' },
  { serial: 'CON-2023-002', name: 'Tortilleria Superior', value: '$32,500', status: 'En Contrato' },
  { serial: 'CON-2023-003', name: 'Angela', value: '$128,000', status: 'Pendiente' },
  { serial: 'CON-2023-004', name: 'Doña Lupita', value: '$15,000', status: 'Aceptado' },
  { serial: 'CON-2023-005', name: 'Zona Norte', value: '$85,000', status: 'Alerta' },
];

const progressBars = [
  { label: 'Harinas', percent: 75, color: '#85a3bf' },
  { label: 'Lácteos', percent: 65, color: '#ccb9b2' },
  { label: 'Cereales', percent: 40, color: '#6383a1' },
  { label: 'Granos', percent: 35, color: '#a8948d' },
  { label: 'Colorantes', percent: 22, color: '#252525' },
  { label: 'Otros', percent: 12, color: '#afc2c4' },
];

const timeCards = [
  { days: 25, label: 'Días promedio - NDA' },
  { days: 42, label: 'Días promedio - Cierre' },
  { days: 12, label: 'Días para renovar' },
  { days: 8, label: 'Alertas activas' },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Aceptado': return { bg: '#d1fae5', text: '#047857' };
    case 'En Contrato': return { bg: '#e6edf4', text: '#6383a1' };
    case 'Pendiente': return { bg: '#fef3c7', text: '#b45309' };
    case 'Alerta': return { bg: '#fee2e2', text: '#b91c1c' };
    default: return { bg: '#f1f5f9', text: '#475569' };
  }
};

export default function Home() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Panel de Información</Text>
          <Text style={styles.headerSubtitle}>Resumen general de contratos y métricas</Text>
        </View>

        {/* Summary Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsContainer}>
          {summaryStats.map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: stat.bgColor }]}>
                <Feather name={stat.icon} size={22} color={stat.color} />
              </View>
              <View>
                <View style={styles.statTitleRow}>
                  <View style={[styles.dot, { backgroundColor: stat.color }]} />
                  <Text style={styles.statTitle}>{stat.title}</Text>
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Contracts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Contratos</Text>
            <TouchableOpacity><Text style={styles.seeAll}>Ver todos →</Text></TouchableOpacity>
          </View>
          {contractsData.map((contract, i) => {
            const s = getStatusStyle(contract.status);
            return (
              <View key={i} style={styles.contractRow}>
                <View style={styles.contractLeft}>
                  <Text style={styles.contractSerial}>{contract.serial}</Text>
                  <Text style={styles.contractName}>{contract.name}</Text>
                </View>
                <View style={styles.contractRight}>
                  <Text style={styles.contractValue}>{contract.value}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.statusText, { color: s.text }]}>{contract.status}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Familias más vendidas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="trending-up" size={18} color="#94a3b8" />
            <Text style={styles.sectionTitle}>Familias más Vendidas</Text>
          </View>
          {progressBars.map((bar, i) => (
            <View key={i} style={styles.progressItem}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>{bar.label}</Text>
                <Text style={styles.progressPercent}>{bar.percent}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${bar.percent}%`, backgroundColor: bar.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Time Cards */}
        <View style={styles.timeCardsGrid}>
          {timeCards.map((card, i) => (
            <View key={i} style={styles.timeCard}>
              <Text style={styles.timeCardDays}>{card.days}</Text>
              <Text style={styles.timeCardLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1e293b', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4 },

  statsContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statTitle: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginTop: 2 },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', flex: 1 },
  seeAll: { fontSize: 13, color: '#6383a1', fontWeight: '600' },

  contractRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  contractLeft: { flex: 1 },
  contractSerial: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  contractName: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 2 },
  contractRight: { alignItems: 'flex-end', gap: 6 },
  contractValue: { fontSize: 14, fontWeight: '800', color: '#334155' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  progressItem: { marginBottom: 14 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
  progressPercent: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  progressTrack: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  timeCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 12,
  },
  timeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  timeCardDays: { fontSize: 32, fontWeight: '800', color: '#1e293b' },
  timeCardLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6, textAlign: 'center' },
});
