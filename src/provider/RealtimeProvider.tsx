import React, { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { supabase } from "../services/api/supabaseClient";
import { syncApp } from "../sync";

export const RealtimeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 1. Sincronización inicial al cargar el componente
    syncApp();

    // 2. Suscribirse a los WebSockets de Supabase
    const channel = supabase
      .channel("inventario-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" }, // Escucha cualquier cambio en tablas de public
        (payload) => {
          // Debounce: Evita múltiples sincronizaciones seguidas si hay una carga masiva
          if (syncTimeout.current) clearTimeout(syncTimeout.current);

          syncTimeout.current = setTimeout(() => {
            console.log(
              `📡 Cambio remoto en tabla [${payload.table}]. Sincronizando...`,
            );
            syncApp();
          }, 1500); // Espera 1.5s después del último cambio para sincronizar
        },
      )
      .subscribe();

    // 3. Sincronizar automáticamente cuando la app vuelve al primer plano (foreground)
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        console.log("📱 App activa. Sincronizando datos pendientes...");
        syncApp();
      }
    });

    // Limpieza al desmontar
    return () => {
      supabase.removeChannel(channel);
      subscription.remove();
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
    };
  }, []);

  return <>{children}</>;
};
