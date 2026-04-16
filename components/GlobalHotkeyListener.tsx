import { useSettings } from "@/src/context/SettingsContext";
import { useEffect } from "react";
import { Platform } from "react-native";
import { router, usePathname } from "expo-router";

// Mapa de rutas para los hotkeys de navegación
const HOTKEY_NAV_MAP: Record<string, string> = {
    nav_home: '/home',
    nav_inventory: '/inventory',
    nav_clients: '/clients',
    nav_prices: '/prices',
    nav_invoices: '/invoices',
    nav_settings: '/settings',
    nav_catalogs: '/catalogs',
};

export function GlobalHotkeyListener() {
    const { hotkeys } = useSettings();
    const pathname = usePathname();

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        // No escuchar en la pantalla de login (o donde se indique)
        if (pathname === '/login' || pathname === '/(auth)/login' || pathname.includes('login')) return;

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
                    router.replace(HOTKEY_NAV_MAP[actionId] as any);
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [hotkeys, pathname]);

    return null;
}
