import {
  BarChart3,
  Calendar,
  DoorOpen,
  Home,
  Moon,
  Settings,
  ShieldCheck,
  TreePine,
  Trophy,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { useAdminMode } from "../../hooks/useAdminMode";
import { useHauntScope } from "../../hooks/useHauntScope";
import { attractionTypeLabel } from "../../models/haunt";
import { cn } from "../../utils/cn";
import { HauntSelector } from "./HauntSelector";
import "./Sidebar.css";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

const ADMIN_ITEM: NavItem = { to: "/admin", label: "Admin Mode", icon: ShieldCheck };
const SETTINGS_ITEM: NavItem = { to: "/settings", label: "Settings", icon: Settings };

function NavRow({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.to === "/"}
        className={({ isActive }) => cn("sidebar__link", isActive && "sidebar__link--active")}
      >
        <Icon size={18} strokeWidth={1.75} />
        <span>{item.label}</span>
      </NavLink>
    </li>
  );
}

export function Sidebar() {
  const [adminMode] = useAdminMode();
  const { hauntId } = useHauntScope();

  // The walk-through section is called whatever the haunt in view calls it:
  // Houses at HHN, Mazes at Knott's, and "Houses & Mazes" where both are on
  // screen. Nothing here ever shows the database's own word for it.
  const primaryNavItems: NavItem[] = [
    { to: "/", label: "Home", icon: Home },
    { to: "/houses", label: attractionTypeLabel("house", hauntId, "many"), icon: DoorOpen },
    {
      to: "/scare-zones",
      label: attractionTypeLabel("scare_zone", hauntId, "many"),
      icon: TreePine,
    },
    { to: "/years", label: "Years", icon: Calendar },
    { to: "/rankings", label: "Rankings", icon: Trophy },
    { to: "/statistics", label: "Statistics", icon: BarChart3 },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <Moon size={18} strokeWidth={1.75} className="sidebar__brand-icon" />
        <span className="sidebar__brand-name">Haunt Ranker</span>
      </div>

      <HauntSelector />

      <nav className="sidebar__nav" aria-label="Primary">
        <ul>
          {primaryNavItems.map((item) => (
            <NavRow key={item.to} item={item} />
          ))}
          <li className="sidebar__spacer" aria-hidden="true" />
          {/* Only listed once editing is switched on — a reading tool by default. */}
          {adminMode && <NavRow item={ADMIN_ITEM} />}
          <NavRow item={SETTINGS_ITEM} />
        </ul>
      </nav>
    </aside>
  );
}
