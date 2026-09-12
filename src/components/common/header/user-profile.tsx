"use client";

import { GearIcon, LogoutIcon } from "@/components/common/header/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/tailgrids/core/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuSection,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/tailgrids/core/dropdown";
import { useAuth } from "@/services/spine/auth-context";
import { API_URL, api } from "@/services/spine/api";
import { AltArrowDownIcon } from "@/utils/icon";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/services/i18n";

interface UserProfileMenuItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

/** Label + kode locale — sumber tunggal untuk picker di menu profile. */
const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "id", label: "Indonesia" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
];

export function UserProfileButton() {
  const router = useRouter();
  const t = useT();
  const { user, logout, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);

  // Belum login: trigger jadi link ke halaman login.
  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2.5 rounded-lg border border-card-border bg-card-background px-3.5 py-2 text-sm font-medium text-text-primary transition-colors hover:border-primary-300"
      >
        {t("Login")}
      </Link>
    );
  }

  const menuItems: UserProfileMenuItem[] = [
    {
      href: "/settings",
      icon: <GearIcon />,
      label: t("Settings"),
    },
  ];

  const avatarSrc = user.avatar ? `${API_URL}/storage/${user.avatar}` : null;

  async function pickLanguage(code: string) {
    if (saving || code === user?.locale) return;
    setSaving(true);
    const res = await api<{ locale: string }>("/api/v1/user/locale", {
      method: "PUT",
      body: JSON.stringify({ locale: code }),
    });
    if (res.ok && user) updateUser({ ...user, locale: code });
    setSaving(false);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2.5 rounded-lg border-0 p-0 transition-all outline-none focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 focus-visible:ring-offset-1">
        <Avatar>
          {avatarSrc && <AvatarImage src={avatarSrc} alt={user.name} />}
          <AvatarFallback className="rounded-lg border border-border-secondary-alt bg-background-gray-secondary_alt">
            {user.name.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <span className="text-sm leading-5 font-medium text-text-primary">{user.name}</span>

        <AltArrowDownIcon className="text-icon-tertiary transition-transform duration-200 group-aria-expanded:-rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent placement="bottom end" className="w-70 overflow-hidden p-0 shadow-3xl">
        <DropdownMenuHeader className="flex w-full items-center justify-start gap-2 border-b border-border-secondary-alt px-4 py-3">
          <Avatar size="md">
            {avatarSrc && <AvatarImage src={avatarSrc} alt={user.name} />}
            <AvatarFallback className="border border-border-secondary-alt bg-background-gray-secondary_alt">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="flex flex-col">
            <span className="text-sm font-medium text-text-primary">{user.name}</span>
            <span className="truncate text-xs text-gray-500">{user.email}</span>
          </span>
        </DropdownMenuHeader>

        <DropdownMenuSection className="p-1.5">
          {menuItems.map((item) => (
            <DropdownMenuItem
              key={item.label}
              href={item.href}
              className="cursor-pointer px-3 py-2.5"
              render={(domProps) =>
                "href" in domProps ? <Link {...domProps} /> : <div {...domProps} />
              }
            >
              <span className="shrink-0 text-icon-secondary group-hover:text-text-primary">
                {item.icon}
              </span>
              <span className="leading-5 font-medium">{item.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuSection>

        <DropdownMenuSeparator />

        <DropdownMenuSection className="p-1.5" selectionMode="single">
          <DropdownMenuHeader className="px-3 pt-1.5 pb-1 text-xs uppercase text-text-tertiary">
            {t("Bahasa")}
          </DropdownMenuHeader>
          {LANGUAGES.map((l) => (
            <DropdownMenuItem
              key={l.code}
              onAction={() => pickLanguage(l.code)}
              className="cursor-pointer px-3 py-2.5"
            >
              <span className="w-4 shrink-0 text-icon-secondary">
                {user.locale === l.code ? "✓" : ""}
              </span>
              <span className="leading-5 font-medium">{l.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuSection>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onAction={async () => {
            await logout();
            router.push("/login");
          }}
          className="m-1.5 w-auto cursor-pointer px-3 py-2.5"
        >
          <span className="text-icon-secondary group-hover:text-text-primary">
            <LogoutIcon />
          </span>
          <span className="leading-5">{t("Logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
