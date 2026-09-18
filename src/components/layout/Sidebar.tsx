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
import { cn } from "../../utils/cn";
import "./Sidebar.css";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/houses", label: "Houses", icon: DoorOpen },
  { to: "/scare-zones", label: "Scare Zones", icon: TreePine },
  { to: "/years", label: "Years", icon: Calendar },
  { to: "/rankings", label: "Rankings", icon: Trophy },
  { to: "/statistics", label: "Statistics", icon: BarChart3 },
];

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

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <Moon size={18} strokeWidth={1.75} className="sidebar__brand-icon" />
        <span className="sidebar__brand-name">Haunt Ranker</span>
      </div>

      <nav className="sidebar__nav" aria-label="Primary">
        <ul>
          {PRIMARY_NAV_ITEMS.map((item) => (
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
