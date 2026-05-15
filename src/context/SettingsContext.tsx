// src/context/SettingsContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// ==========================================
// TIPOS
// ==========================================

export type ThemeMode = "light" | "dark" | "auto";

export interface NotificationPreferences {
    inventoryAlerts: boolean;
    salesSummary: boolean;
}

export interface HotkeyMap {
    [actionId: string]: string;
}

export interface SettingsContextType {
    // Tema
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;

    // Notificaciones
    notifications: NotificationPreferences;
    setNotificationPref: (key: keyof NotificationPreferences, value: boolean) => void;

    // Hotkeys
    hotkeys: HotkeyMap;
    setHotkeys: (hotkeys: HotkeyMap) => void;
    updateHotkey: (actionId: string, combo: string) => void;

    // Persistencia
    saveAllSettings: () => Promise<void>;
    isLoading: boolean;
    hasUnsavedChanges: boolean;
}

// ==========================================
// CONSTANTES POR DEFECTO
// ==========================================

const STORAGE_KEY_THEME = "settings_theme";
const STORAGE_KEY_NOTIFICATIONS = "settings_notifications";
const STORAGE_KEY_HOTKEYS = "settings_hotkeys";

export const DEFAULT_HOTKEYS: HotkeyMap = {
    nav_home: "Ctrl + H",
    nav_inventory: "Ctrl + I",
    nav_clients: "Ctrl + C",
    nav_suppliers: "Ctrl + O",
    nav_prices: "Ctrl + P",
    nav_invoices: "Ctrl + F",
    nav_settings: "Ctrl + S",
    nav_catalogs: "Ctrl + T",
    nav_users: "Ctrl + U",

    action_add_client: "Alt + C",
    action_add_supplier: "Alt + O",
    action_add_product: "Alt + I",
    action_add_invoice: "Alt + F",
    action_add_user: "Alt + U",
};

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
    inventoryAlerts: true,
    salesSummary: true,
};

// ==========================================
// CONTEXTO
// ==========================================

const SettingsContext = createContext<SettingsContextType>({} as SettingsContextType);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setThemeState] = useState<ThemeMode>("light");
    const [notifications, setNotifications] = useState<NotificationPreferences>(DEFAULT_NOTIFICATIONS);
    const [hotkeys, setHotkeysState] = useState<HotkeyMap>(DEFAULT_HOTKEYS);
    const [isLoading, setIsLoading] = useState(true);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Valores iniciales guardados para detectar cambios
    const [savedTheme, setSavedTheme] = useState<ThemeMode>("light");
    const [savedNotifications, setSavedNotifications] = useState<NotificationPreferences>(DEFAULT_NOTIFICATIONS);
    const [savedHotkeys, setSavedHotkeys] = useState<HotkeyMap>(DEFAULT_HOTKEYS);

    // Cargar configuración al inicio
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [themeStr, notifStr, hotkeyStr] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEY_THEME),
                    AsyncStorage.getItem(STORAGE_KEY_NOTIFICATIONS),
                    AsyncStorage.getItem(STORAGE_KEY_HOTKEYS),
                ]);

                const loadedTheme: ThemeMode = (themeStr as ThemeMode) || "light";
                const loadedNotif: NotificationPreferences = notifStr
                    ? { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(notifStr) }
                    : DEFAULT_NOTIFICATIONS;
                const loadedHotkeys: HotkeyMap = hotkeyStr
                    ? { ...DEFAULT_HOTKEYS, ...JSON.parse(hotkeyStr) }
                    : DEFAULT_HOTKEYS;

                setThemeState(loadedTheme);
                setNotifications(loadedNotif);
                setHotkeysState(loadedHotkeys);

                setSavedTheme(loadedTheme);
                setSavedNotifications(loadedNotif);
                setSavedHotkeys(loadedHotkeys);
            } catch (e) {
                console.log("Error al cargar configuraciones:", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    // Detectar cambios no guardados
    useEffect(() => {
        if (isLoading) return;
        const themeChanged = theme !== savedTheme;
        const notifChanged = JSON.stringify(notifications) !== JSON.stringify(savedNotifications);
        const hotkeyChanged = JSON.stringify(hotkeys) !== JSON.stringify(savedHotkeys);
        setHasUnsavedChanges(themeChanged || notifChanged || hotkeyChanged);
    }, [theme, notifications, hotkeys, savedTheme, savedNotifications, savedHotkeys, isLoading]);

    // Aplicar tema oscuro globalmente
    useEffect(() => {
        if (typeof window === 'undefined' || !window.document) return;

        const applyTheme = () => {
            const root = window.document.documentElement;
            if (theme === 'dark') {
                root.classList.add('dark');
            } else if (theme === 'light') {
                root.classList.remove('dark');
            } else if (theme === 'auto') {
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (systemPrefersDark) {
                    root.classList.add('dark');
                } else {
                    root.classList.remove('dark');
                }
            }
        };

        applyTheme();

        if (theme === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = () => applyTheme();
            mediaQuery.addEventListener('change', listener);
            return () => mediaQuery.removeEventListener('change', listener);
        }
    }, [theme]);

    const setTheme = useCallback((newTheme: ThemeMode) => {
        setThemeState(newTheme);
    }, []);

    const setNotificationPref = useCallback((key: keyof NotificationPreferences, value: boolean) => {
        setNotifications(prev => ({ ...prev, [key]: value }));
    }, []);

    const setHotkeys = useCallback((newHotkeys: HotkeyMap) => {
        setHotkeysState(newHotkeys);
    }, []);

    const updateHotkey = useCallback((actionId: string, combo: string) => {
        setHotkeysState(prev => ({ ...prev, [actionId]: combo }));
    }, []);

    const saveAllSettings = useCallback(async () => {
        try {
            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEY_THEME, theme),
                AsyncStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications)),
                AsyncStorage.setItem(STORAGE_KEY_HOTKEYS, JSON.stringify(hotkeys)),
            ]);

            // Actualizar los valores "guardados" para resetear el estado de cambios
            setSavedTheme(theme);
            setSavedNotifications({ ...notifications });
            setSavedHotkeys({ ...hotkeys });
        } catch (e) {
            console.error("Error al guardar configuraciones:", e);
            throw e;
        }
    }, [theme, notifications, hotkeys]);

    return (
        <SettingsContext.Provider
            value={{
                theme,
                setTheme,
                notifications,
                setNotificationPref,
                hotkeys,
                setHotkeys,
                updateHotkey,
                saveAllSettings,
                isLoading,
                hasUnsavedChanges,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
