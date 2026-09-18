import { Outlet } from "react-router-dom";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { Atmosphere } from "../atmosphere/Atmosphere";
import { Sidebar } from "./Sidebar";
import "./AppShell.css";

export function AppShell() {
  // Mounted here so the motion choice applies to every page, not only to
  // Settings where it's changed.
  useMotionPreference();

  return (
    <div className="app-shell">
      <Atmosphere />
      <Sidebar />
      <main className="app-shell__content">
        <div className="app-shell__content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
