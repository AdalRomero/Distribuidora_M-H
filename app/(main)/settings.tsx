import ErrorModal from '@/components/ui/modals/ErrorModal';
import HotkeysModal from '@/components/ui/modals/HotkeysModal';
import SuccessModal from '@/components/ui/modals/SuccessModal';
import { useAuth } from '@/src/context/AuthContext';
import { DEFAULT_HOTKEYS, useSettings } from '@/src/context/SettingsContext';
import {
    AlertCircle,
    Bell,
    Check, Info,
    Keyboard,
    Loader2,
    Monitor,
    Moon,
    Save, Settings as SettingsIcon,
    Sun
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Mapa de rutas para los hotkeys de navegación
const HOTKEY_NAV_MAP: Record<string, string> = {
    nav_home: '/home',
    nav_inventory: '/inventory',
    nav_clients: '/clients',
    nav_prices: '/prices',
    nav_invoices: '/invoices',
    nav_settings: '/settings',
};

export default function Settings() {
    const {
        theme, setTheme,
        notifications, setNotificationPref,
        hotkeys,
        saveAllSettings,
        isLoading: isSettingsLoading,
        hasUnsavedChanges,
    } = useSettings();

    const { userName, userRole, userId } = useAuth();

    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isHotkeysModalOpen, setIsHotkeysModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSavedIndicator, setShowSavedIndicator] = useState(false);

    // ==========================================
    // GUARDAR CONFIGURACIONES
    // ==========================================
    const handleSave = async () => {
        if (!hasUnsavedChanges) {
            // No hay cambios que guardar
            setIsSuccessModalOpen(true);
            return;
        }

        setIsSaving(true);
        try {
            await saveAllSettings();
            setShowSavedIndicator(true);
            setIsSuccessModalOpen(true);
            setTimeout(() => setShowSavedIndicator(false), 3000);
        } catch (e) {
            setErrorMessage('No se pudieron guardar las configuraciones. Intenta de nuevo.');
            setIsErrorModalOpen(true);
        } finally {
            setIsSaving(false);
        }
    };

    // ==========================================
    // HOTKEYS GLOBALES - Escuchar atajos
    // ==========================================
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
            // Ignorar si el foco está en un input/textarea/select
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

            // Construir la combinación presionada
            const keys = [];
            if (e.ctrlKey) keys.push('Ctrl');
            if (e.altKey) keys.push('Alt');
            if (e.shiftKey) keys.push('Shift');
            if (e.metaKey) keys.push('Cmd');

            if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                keys.push(e.key.toUpperCase());
            } else {
                return; // Solo tecla modificadora, no hacer nada
            }

            const combo = keys.join(' + ');

            // Buscar si algún hotkey coincide
            for (const [actionId, registeredCombo] of Object.entries(hotkeys)) {
                if (registeredCombo === combo && HOTKEY_NAV_MAP[actionId]) {
                    e.preventDefault();
                    // Navegar a la ruta correspondiente
                    if (typeof window !== 'undefined') {
                        window.location.href = HOTKEY_NAV_MAP[actionId];
                    }
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [hotkeys]);

    // ==========================================
    // NOMBRE PARA DISPLAY
    // ==========================================
    const themeOptions: { value: 'light' | 'dark' | 'auto'; label: string; icon: typeof Sun; desc: string }[] = [
        { value: 'light', label: 'Modo Claro', icon: Sun, desc: 'Interfaz brillante y limpia' },
        { value: 'dark', label: 'Modo Oscuro', icon: Moon, desc: 'Reduce fatiga visual' },
        { value: 'auto', label: 'Automático', icon: Monitor, desc: 'Sigue las preferencias del sistema' },
    ];

    const notificationItems = [
        {
            key: 'inventoryAlerts' as const,
            title: 'Alertas de Inventario',
            desc: 'Recibir aviso cuando un producto esté por agotarse.',
            color: 'bg-red-50 text-red-600',
        },
        {
            key: 'salesSummary' as const,
            title: 'Resumen de Ventas',
            desc: 'Envío automático del corte de caja diario.',
            color: 'bg-blue-50 text-blue-600',
        },
    ];

    // Conteo de hotkeys personalizados
    const customizedHotkeysCount = Object.entries(hotkeys).filter(
        ([key, val]) => DEFAULT_HOTKEYS[key] !== val
    ).length;

    if (isSettingsLoading) {
        return (
            <div className="p-4 sm:p-8 bg-slate-50 min-h-screen font-sans flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-slate-500 text-sm font-medium">Cargando configuraciones...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 bg-slate-50 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-mh-blue-dark tracking-tight">Configuraciones</h1>
                        <p className="text-slate-500 text-sm mt-1">Administra las preferencias generales y atajos del sistema.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Indicador de cambios no guardados */}
                        {hasUnsavedChanges && (
                            <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200 animate-pulse">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Cambios sin guardar
                            </span>
                        )}
                        {showSavedIndicator && !hasUnsavedChanges && (
                            <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-200">
                                <Check className="w-3.5 h-3.5" />
                                Guardado
                            </span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-bold text-sm shadow-sm active:scale-95
                                ${hasUnsavedChanges
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                                }
                                ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}
                            `}
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ==========================================
                        HOTKEYS FEATURED CARD
                    ========================================== */}
                    <div className="lg:col-span-3">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 md:p-8 rounded-2xl shadow-md text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                            {/* Decorative background vectors */}
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                            <div className="absolute bottom-0 left-10 -mb-10 w-32 h-32 bg-indigo-900/20 rounded-full blur-xl pointer-events-none"></div>

                            <div className="relative z-10 max-w-xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                                        <Keyboard className="w-6 h-6 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold tracking-tight">Atajos de Teclado (Hotkeys)</h2>
                                </div>
                                <p className="text-blue-100 text-sm md:text-base leading-relaxed">
                                    Optimiza tu flujo de trabajo configurando accesos rápidos para las acciones más comunes del sistema. Genera combinaciones a tu medida.
                                </p>
                                {customizedHotkeysCount > 0 && (
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="px-2.5 py-1 bg-white/15 rounded-full text-xs font-bold text-white border border-white/20">
                                            {customizedHotkeysCount} atajo{customizedHotkeysCount !== 1 ? 's' : ''} personalizado{customizedHotkeysCount !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="relative z-10 w-full md:w-auto shrink-0 flex flex-col gap-3">
                                {/* Preview de un atajo activo */}
                                <div className="flex items-center gap-2 bg-black/20 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                                    <span className="text-sm font-medium mr-2 text-blue-50">Inicio:</span>
                                    {(hotkeys['nav_home'] || 'Ctrl + H').split(' + ').map((key, i, arr) => (
                                        <span key={i} className="flex items-center gap-1">
                                            <kbd className="px-2.5 py-1 bg-white/20 rounded text-sm font-mono font-bold shadow-sm border border-white/30 text-white tracking-widest">{key}</kbd>
                                            {i < arr.length - 1 && <span className="text-blue-200 font-bold px-0.5">+</span>}
                                        </span>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setIsHotkeysModalOpen(true)}
                                    className="w-full px-6 py-3 bg-white text-blue-700 hover:bg-slate-50 font-bold text-sm rounded-xl transition-all shadow-sm active:scale-95 text-center flex items-center justify-center gap-2"
                                >
                                    <Keyboard className="w-4 h-4" />
                                    Configurar Atajos
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ==========================================
                        MAIN AREA: Theme + Notifications
                    ========================================== */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* TEMA DE LA INTERFAZ */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                                <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                                    <SettingsIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Tema de la Interfaz</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Selecciona el modo de color de la aplicación.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {themeOptions.map((option) => {
                                    const Icon = option.icon;
                                    const isSelected = theme === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            onClick={() => setTheme(option.value)}
                                            className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 text-center group
                                                ${isSelected
                                                    ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                                                    : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
                                                }
                                            `}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2.5 right-2.5">
                                                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                                    </div>
                                                </div>
                                            )}
                                            <div className={`p-3 rounded-xl transition-colors ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{option.label}</p>
                                                <p className="text-xs text-slate-500 mt-1">{option.desc}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {theme === 'dark' && (
                                <div className="mt-4 flex items-start gap-2 p-3 bg-slate-800 text-slate-200 rounded-xl text-xs">
                                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                                    <span>El modo oscuro se aplicará globalmente. Algunas secciones ajustarán sus colores de forma automática.</span>
                                </div>
                            )}
                            {theme === 'auto' && (
                                <div className="mt-4 flex items-start gap-2 p-3 bg-indigo-50 text-indigo-700 rounded-xl text-xs">
                                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                                    <span>El tema seguirá la configuración de tu sistema operativo (claro durante el día, oscuro de noche).</span>
                                </div>
                            )}
                        </div>

                        {/* NOTIFICACIONES */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">Notificaciones</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Controla qué alertas deseas recibir del sistema.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {notificationItems.map((item) => {
                                    const isChecked = notifications[item.key];
                                    return (
                                        <div
                                            key={item.key}
                                            className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all duration-200 ${isChecked
                                                ? 'border-slate-100 bg-white'
                                                : 'border-slate-100 bg-slate-50/50'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${item.color}`}>
                                                    <Bell className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                    <p className={`font-semibold text-sm transition-colors ${isChecked ? 'text-slate-700' : 'text-slate-400'}`}>
                                                        {item.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={isChecked}
                                                    onChange={(e) => setNotificationPref(item.key, e.target.checked)}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                </div>

                {/* ==========================================
                    MODALES
                ========================================== */}
                <SuccessModal
                    isOpen={isSuccessModalOpen}
                    onClose={() => setIsSuccessModalOpen(false)}
                    title={'Cambios Guardados'}
                    message={'Tus configuraciones han sido guardadas exitosamente.'}
                />
                <ErrorModal
                    isOpen={isErrorModalOpen}
                    onClose={() => setIsErrorModalOpen(false)}
                    title={'Error al Guardar'}
                    message={errorMessage}
                />
                <HotkeysModal
                    isOpen={isHotkeysModalOpen}
                    onClose={() => setIsHotkeysModalOpen(false)}
                />
            </div>
        </div>
    );
}
