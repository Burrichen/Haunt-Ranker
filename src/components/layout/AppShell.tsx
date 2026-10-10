import { Outlet } from "react-router-dom";
import { useHauntScope } from "../../hooks/useHauntScope";
import { HauntThemeContext } from "../../hooks/useHauntTheme";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { hauntTheme } from "../../models/hauntTheme";
import { HauntRegistryProvider } from "./HauntRegistryProvider";
import { HauntScopeProvider } from "./HauntScopeProvider";
import { Atmosphere } from "../atmosphere/Atmosphere";
import { ArchiveUpdateGate } from "./ArchiveUpdateGate";
import { Sidebar } from "./Sidebar";
import "./AppShell.css";

/**
 * The shell wears the theme of the haunt in view — HHN's, Knott's, or the
 * neutral one for All Haunts — so the nav indicator, tabs, buttons and the
 * page glow follow it. Cards and wiki pages set their own haunt's theme
 * inside it, so content stays recognisable in a combined view.
 */
function ThemedShell() {
  const { hauntId } = useHauntScope();
  const theme = hauntTheme(hauntId);
  return (
    <HauntThemeContext.Provider value={theme}>
      <div className="app-shell" data-haunt-theme={theme}>
        <Atmosphere />
        <Sidebar />
        <main className="app-shell__content">
          <div className="app-shell__content-inner">
            <ArchiveUpdateGate>
              <Outlet />
            </ArchiveUpdateGate>
          </div>
        </main>
      </div>
    </HauntThemeContext.Provider>
  );
}

export function AppShell() {
  // Mounted here so the motion choice applies to every page, not only to
  // Settings where it's changed.
  useMotionPreference();

  return (
    // Which haunts exist, and what they call things, is read once here: the
    // scope below it, the nav and every page all work from those rows rather
    // than naming HHN or Knott's in each screen.
    <HauntRegistryProvider>
      {/* The haunt in view is shared by the nav and every page under it, so
          it is held above both rather than read separately in each. */}
      <HauntScopeProvider>
        <ThemedShell />
      </HauntScopeProvider>
    </HauntRegistryProvider>
  );
}
