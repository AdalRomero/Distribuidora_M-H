import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  'Administrador': ['Inventario', 'Clientes', 'Facturas', 'Precios', 'Usuarios', 'Configuraciones'],
  'Ventas': ['Inventario', 'Clientes', 'Facturas'],
  'Cobranza': ['Clientes', 'Facturas'],
  'Empleado': ['Inventario', 'Clientes'],
  'Personalizado': []
};

type RoleType = 'Administrador' | 'Empleado' | 'Ventas' | 'Cobranza' | 'Personalizado';

interface UserItem {
  id: string; username: string; nombres: string; apellidos: string;
  email: string; role: RoleType; status: boolean; permissions: string[];
}

const initialUsers: UserItem[] = [
  { id: '1', username: 'admin.mh', nombres: 'Administrador', apellidos: 'Principal', email: 'admin@distribuidoramh.com', role: 'Administrador', status: true, permissions: DEFAULT_PERMISSIONS['Administrador'] },
  { id: '2', username: 'vendedor.1', nombres: 'Juan', apellidos: 'Pérez', email: 'juan@distribuidoramh.com', role: 'Ventas', status: true, permissions: DEFAULT_PERMISSIONS['Ventas'] },
];

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [usersList, setUsersList] = useState<UserItem[]>(initialUsers);

  const filtered = usersList.filter(u =>
    u.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = (userId: string, userName: string, currentStatus: boolean) => {
    const action = currentStatus ? 'desactivar' : 'reactivar';
    Alert.alert(
      'Confirmar',
      `¿Estás seguro de ${action} a ${userName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: !currentStatus } : u));
          }
        }
      ]
    );
  };

  const getRoleBg = (role: string) => {
    return role === 'Administrador'
      ? { bg: '#ede9fe', text: '#5b21b6' }
      : { bg: '#eff6ff', text: '#1d4ed8' };
  };

  const renderItem = ({ item }: { item: UserItem }) => {
    const roleStyle = getRoleBg(item.role);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.nombres[0]}{item.apellidos[0] || ''}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.userName}>{item.nombres} {item.apellidos}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: item.status ? '#10b981' : '#ef4444' }]} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.label}>Rol</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
              <Feather name="shield" size={10} color={roleStyle.text} />
              <Text style={[styles.roleText, { color: roleStyle.text }]}>{item.role}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Permisos</Text>
            <Text style={styles.permText} numberOfLines={1}>
              {item.role === 'Administrador' ? 'Acceso Total' : item.permissions.join(', ')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Estado</Text>
            <View style={[styles.statusBadge, { backgroundColor: item.status ? '#d1fae5' : '#fee2e2' }]}>
              <Text style={[styles.statusText, { color: item.status ? '#047857' : '#b91c1c' }]}>{item.status ? 'Activo' : 'Inactivo'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Feather name="edit-2" size={16} color="#3b82f6" />
            <Text style={[styles.actionText, { color: '#3b82f6' }]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleStatus(item.id, item.nombres, item.status)}>
            <Feather name={item.status ? 'user-x' : 'user-check'} size={16} color={item.status ? '#dc2626' : '#10b981'} />
            <Text style={[styles.actionText, { color: item.status ? '#dc2626' : '#10b981' }]}>
              {item.status ? 'Desactivar' : 'Activar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
        <Text style={styles.headerSubtitle}>Administra accesos y roles del equipo</Text>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#94a3b8" />
        <TextInput style={styles.searchInput} placeholder="Buscar por nombre o correo..." placeholderTextColor="#94a3b8" value={searchTerm} onChangeText={setSearchTerm} />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No hay usuarios.</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  headerSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#1e293b', marginLeft: 10 },

  listContainer: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },

  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#334155' },
  cardInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  userEmail: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  cardBody: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  permText: { fontSize: 11, color: '#64748b', fontWeight: '500', flex: 1, textAlign: 'right', marginLeft: 10 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  actionText: { fontSize: 12, fontWeight: '700' },

  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
});
