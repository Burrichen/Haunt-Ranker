import { Outlet } from "react-router-dom";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { HauntScopeProvider } from "./HauntScopeProvider";
import { Atmosphere } from "../atmosphere/Atmosphere";
import { Sidebar } from "./Sidebar";
import "./AppShell.css";

export function AppShell() {
  // Mounted here so the motion choice applies to every page, not only to
  // Settings where it's changed.
  useMotionPreference();

  return (
    // The haunt in view is shared by the nav and every page under it, so it
    // is held above both rather than read separately in each.
    <HauntScopeProvider>
      <div className="app-shell">
        <Atmosphere />
        <Sidebar />
        <main className="app-shell__content">
          <div className="app-shell__content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </HauntScopeProvider>
  );
}
