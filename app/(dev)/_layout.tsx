import { Slot } from "expo-router";
import SideBarMenu from "../../components/ui/SideBarMenu";

export default function DevLayout() {
  return (
    <div className="flex h-screen w-full bg-gray-950 overflow-hidden">
      <SideBarMenu />
      <main className="flex-1 overflow-y-auto relative">
        <Slot />
      </main>
    </div>
  );
}
