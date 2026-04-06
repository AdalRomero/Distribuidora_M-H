import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

type BusinessType = 'caja' | 'pastel';

export default function Login() {
  const router = useRouter();
  const [accessNumber, setAccessNumber] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>('caja');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      setLoading(false);
      router.replace('/home' as any);
    }, 800);
  };

  const isCaja = businessType === 'caja';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isCaja ? '#c8d5e0' : '#cab6af' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={[styles.title, isCaja ? styles.titleCaja : styles.titlePastel]}>
              {isCaja ? 'DISTRIBUIDORA M-H' : 'La Tiendita del Repostero'}
            </Text>
            <Text style={[styles.subtitle, { color: isCaja ? '#1e3a5f' : '#9f1239' }]}>
              Iniciar Sesión
            </Text>
            <Text style={[styles.helperText, { color: isCaja ? '#374151' : '#831843' }]}>
              Selecciona el área de trabajo
            </Text>
          </View>

          {/* Business Type Selector */}
          <View style={styles.selectorContainer}>
            <TouchableOpacity
              onPress={() => setBusinessType('caja')}
              style={[
                styles.selectorButton,
                isCaja ? styles.selectorActive : styles.selectorInactive,
                isCaja && { borderColor: '#3b82f6', shadowColor: '#3b82f6' },
              ]}
              activeOpacity={0.7}
            >
              <Feather name="package" size={24} color={isCaja ? '#2563eb' : '#6b7280'} />
              {isCaja && (
                <View style={styles.checkBadge}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setBusinessType('pastel')}
              style={[
                styles.selectorButton,
                !isCaja ? styles.selectorActive : styles.selectorInactive,
                !isCaja && { borderColor: '#f43f5e', shadowColor: '#f43f5e' },
              ]}
              activeOpacity={0.7}
            >
              <Feather name="gift" size={24} color={!isCaja ? '#f43f5e' : '#6b7280'} />
              {!isCaja && (
                <View style={[styles.checkBadge, { backgroundColor: '#22c55e' }]}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Username Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: isCaja ? '#374151' : '#881337' }]}>Usuario</Text>
            <View style={styles.inputWrapper}>
              <Feather
                name="user"
                size={18}
                color={isCaja ? '#3b82f6' : '#f43f5e'}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Ingresa tu usuario"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: isCaja ? '#374151' : '#881337' }]}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.inputIcon}>
                <Feather
                  name={showPassword ? 'unlock' : 'lock'}
                  size={18}
                  color={isCaja ? '#3b82f6' : '#f43f5e'}
                />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                secureTextEntry={!showPassword}
                value={accessNumber}
                onChangeText={setAccessNumber}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={[
              styles.submitButton,
              { backgroundColor: isCaja ? '#15335c' : '#f43f5e' },
              loading && { opacity: 0.7 },
            ]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Ingresar</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  headerContainer: { alignItems: 'center', marginBottom: 28 },
  title: { fontWeight: '800', textAlign: 'center' },
  titleCaja: { fontSize: 28, color: '#1e3a5f', letterSpacing: 1 },
  titlePastel: { fontSize: 32, color: '#9f1239' },
  subtitle: { fontSize: 22, fontWeight: '700', marginTop: 6 },
  helperText: { marginTop: 6, fontSize: 13, fontWeight: '500' },

  selectorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 28,
  },
  selectorButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorActive: {
    backgroundColor: '#fff',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    transform: [{ scale: 1.1 }],
  },
  selectorInactive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  errorContainer: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#f87171',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#b91c1c', fontSize: 13 },

  fieldContainer: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(200,200,220,0.5)',
    paddingHorizontal: 14,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
  },

  submitButton: {
    marginTop: 24,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
