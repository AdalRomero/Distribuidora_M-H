import { Slot, Redirect } from "expo-router";
import SideBarMenu from "../../components/ui/SideBarMenu";
import SyncProtectionGuard from "../../components/ui/SyncProtectionGuard";
import { useAuth } from "../../src/context/AuthContext";
import React from "react";

export default function MainLayout() {
  const { userId, loading } = useAuth();

  // Cargador premium alineado con la estética de la app
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-slate-900 text-white">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-500/30 border-b-blue-500/10 border-l-blue-500/40 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-t-indigo-400 border-r-indigo-400/20 border-b-indigo-400/5 border-l-indigo-400/30 animate-spin animate-reverse" style={{ animationDuration: "1s" }} />
        </div>
        <p className="mt-6 text-sm font-semibold tracking-wide text-blue-200 animate-pulse uppercase">
          Verificando sesión...
        </p>
      </div>
    );
  }

  // Redirigir a login si no hay sesión activa
  if (!userId) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 dark:bg-slate-900 overflow-hidden">
      <SideBarMenu />
      <SyncProtectionGuard />
      <main className="flex-1 overflow-y-auto relative">
        <Slot />
      </main>
    </div>
  );
}
