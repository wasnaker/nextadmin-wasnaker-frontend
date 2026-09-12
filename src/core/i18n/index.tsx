"use client";

import { createContext, useContext } from "react";
import { useAuth } from "@/core/auth/auth-context";
import { DICT, LOCALES, type Locale } from "./dict";

/**
 * i18n minimal: t("Dashboard") pakai users.locale dari auth-context.
 * Key yang belum ada di kamus → teks Inggris (key-nya sendiri).
 */
type T = (source: string, vars?: Record<string, string | number>) => string;

const Ctx = createContext<T>((s) => s);

function isLocale(v: string | null | undefined): v is Locale {
  return !!v && LOCALES.some((l) => l.code === v);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const locale = isLocale(user?.locale) ? user.locale : "en";
  const t: T = (s, vars) => {
    // ponytail: interpolasi token {name} saja; plural/biarkan fallback ke teks sumber.
    const out = DICT[locale][s] ?? s;
    return vars ? out.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : out;
  };
  return <Ctx.Provider value={t}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
