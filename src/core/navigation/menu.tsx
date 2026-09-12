"use client";

import { HomeIcon, UserIcon } from "@/components/common/sidebar/icon";
import { can, type AuthUser } from "@/core/auth/auth-context";
import type { ModuleMenuItem } from "@/core/modules/module-extensions";

/**
 * Satu model navigasi: menu platform (dimiliki core) + menu modul (manifest
 * backend lewat ext.menu). Sidebar & searchbar mengonsumsi ini — jangan taruh
 * daftar modul di sidebar lagi.
 */
export interface NavItem {
  title: string;
  url?: string;
  icon?: React.ReactNode;
  items?: { title: string; url?: string }[];
  /** Permission RBAC; tanpa permission = selalu tampil. */
  permission?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

const PLATFORM_SECTIONS: NavSection[] = [
  {
    label: "MAIN MENU",
    items: [
      { title: "Dashboard", url: "/", icon: <HomeIcon /> },
      { title: "Profile", url: "/profile", icon: <UserIcon /> },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Users", url: "/users", permission: "users:view" },
      { title: "Roles & Permission", url: "/roles", permission: "roles:view" },
    ],
  },
];

/** Item platform yang tampil menyatu dengan daftar modul. */
const MODULE_AREA_ITEMS: NavItem[] = [
  { title: "Settings", url: "/settings", permission: "settings:view" },
];

export function navSections(
  user: AuthUser | null,
  modules: ModuleMenuItem[],
): NavSection[] {
  const allowed = (i: NavItem) => !i.permission || can(user, i.permission);

  const platform = PLATFORM_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter(allowed),
  })).filter((s) => s.items.length > 0);

  const moduleItems: NavItem[] = [
    ...modules.map((m) => ({
      title: m.label,
      url: m.href,
      icon: m.icon ? <span className="text-base">{m.icon}</span> : undefined,
      items: m.children,
      permission: m.permission,
    })),
    ...MODULE_AREA_ITEMS,
  ].filter(allowed);

  return moduleItems.length
    ? [...platform, { label: "Modules", items: moduleItems }]
    : platform;
}
