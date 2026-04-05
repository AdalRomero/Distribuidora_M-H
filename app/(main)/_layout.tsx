import { Slot } from "expo-router";
import SideBarMenu from "../../components/ui/SideBarMenu";

export default function MainLayout() {
  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden">
      <SideBarMenu />
      <main className="flex-1 overflow-y-auto relative">
        <Slot />
      </main>
    </div>
  );
}
