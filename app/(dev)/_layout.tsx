import { Slot, Redirect } from "expo-router";
import SideBarMenu from "../../components/ui/SideBarMenu";
import { useAuth } from "../../src/context/AuthContext";
import React from "react";

export default function DevLayout() {
  const { userId, isDev, loading } = useAuth();

  // Cargador premium alineado con la estética de la app
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-slate-950 text-white">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 border-r-amber-500/30 border-b-amber-500/10 border-l-amber-500/40 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-t-orange-400 border-r-orange-400/20 border-b-orange-400/5 border-l-orange-400/30 animate-spin animate-reverse" style={{ animationDuration: "1s" }} />
        </div>
        <p className="mt-6 text-sm font-semibold tracking-wide text-amber-200 animate-pulse uppercase">
          Verificando credenciales de desarrollador...
        </p>
      </div>
    );
  }

  // Redirigir a login si no hay sesión activa
  if (!userId) {
    return <Redirect href="/(auth)/login" />;
  }

  // Redirigir al home principal si no es desarrollador autorizado
  if (!isDev) {
    return <Redirect href="/(main)/home" />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-gray-950 overflow-hidden">
      <SideBarMenu />
      <main className="flex-1 overflow-y-auto relative">
        <Slot />
      </main>
    </div>
  );
}
