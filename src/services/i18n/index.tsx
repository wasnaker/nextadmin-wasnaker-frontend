"use client";

import { createContext, useContext } from "react";
import { useAuth } from "@/services/spine/auth-context";
import { DICT, LOCALES, type Locale } from "./dict";

/**
 * i18n minimal: t("Dashboard") pakai users.locale dari auth-context.
 * Key yang belum ada di kamus → teks Inggris (key-nya sendiri).
 */
const Ctx = createContext<(source: string) => string>((s) => s);

function isLocale(v: string | null | undefined): v is Locale {
  return !!v && LOCALES.some((l) => l.code === v);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const locale = isLocale(user?.locale) ? user.locale : "en";
  return <Ctx.Provider value={(s) => DICT[locale][s] ?? s}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
