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
    nav_users: '/users',
};

export function GlobalHotkeyListener() {
    const { hotkeys } = useSettings();
    const pathname = usePathname();

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        // No escuchar en la pantalla de login (o donde se indique)
        if (pathname === '/login' || pathname === '/(auth)/login' || pathname.includes('login')) return;

        const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
            // Construir la combinación presionada
            const keys = [];
            if (e.ctrlKey) keys.push('Ctrl');
            if (e.altKey) keys.push('Alt');
            if (e.shiftKey) keys.push('Shift');
            if (e.metaKey) keys.push('Cmd');

            if (!e.key || typeof e.key !== 'string') return;

            if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                return; // Solo tecla modificadora, no hacer nada
            }

            let mainKey = e.key.toUpperCase();
            if (e.code && e.code.startsWith('Key')) {
                mainKey = e.code.replace('Key', '');
            } else if (e.code && e.code.startsWith('Digit')) {
                mainKey = e.code.replace('Digit', '');
            }

            keys.push(mainKey);

            const combo = keys.join(' + ');
            console.log("TECLA PRESIONADA:", combo, " | EVENTO:", e.key, e.code);

            // Buscar si algún hotkey coincide
            for (const [actionId, registeredCombo] of Object.entries(hotkeys)) {
                if (registeredCombo === combo) {
                    console.log("MATCH HOTKEY:", actionId);
                    if (HOTKEY_NAV_MAP[actionId]) {
                        // Es una ruta de navegación
                        const target = e.target as HTMLElement;
                        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return; // Ignorar en inputs
                        
                        e.preventDefault();
                        router.replace(HOTKEY_NAV_MAP[actionId] as any);
                        return;
                    } else if (actionId.startsWith('action_')) {
                        // Es una acción de creación (como abrir un modal)
                        const target = e.target as HTMLElement;
                        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return; // Ignorar en inputs

                        e.preventDefault();
                        
                        // Mapear cada acción a su ruta correspondiente
                        const routeMap: Record<string, string> = {
                            'action_add_client': '/clients',
                            'action_add_supplier': '/suppliers',
                            'action_add_product': '/inventory',
                            'action_add_user': '/users',
                            'action_add_invoice': '/invoices'
                        };

                        const targetRoute = routeMap[actionId];
                        const isSameRoute = pathname === targetRoute || pathname.endsWith(targetRoute);

                        console.log("ACTION HOTKEY TRIGGERED:", actionId, "Target:", targetRoute, "Current:", pathname, "IsSame:", isSameRoute);

                        if (targetRoute && !isSameRoute) {
                            // Navegar a la pantalla correspondiente con un parámetro para abrir el modal
                            router.push({ pathname: targetRoute as any, params: { openModal: actionId } });
                        } else {
                            // Ya estamos en la pantalla, simplemente disparar el evento
                            window.dispatchEvent(new CustomEvent('action_hotkey', { detail: { actionId } }));
                        }
                        return;
                    }
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [hotkeys, pathname]);

    return null;
}
