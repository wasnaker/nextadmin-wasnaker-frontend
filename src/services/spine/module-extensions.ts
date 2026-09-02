"use client";

import { useQuery } from "@tanstack/react-query";
import { api, getToken } from "./api";

/** Kontrak tab detail dari manifest modul (detail_tabs[]). */
export interface DetailTab {
  slug: string;
  label: string;
  icon?: string;
  /** Path dengan placeholder {id}, mis. /api/v1/sample/{id}/activity-logs */
  api: string;
  position?: number;
}

export interface ModuleMenuItem {
  slug: string;
  label: string;
  icon?: string;
  href: string;
  position?: number;
  module: string;
}

export interface ModuleWidget {
  id: string;
  area: string;
  title: string;
  api: string;
  module: string;
}

export interface ModuleExtensions {
  menu: ModuleMenuItem[];
  widgets: ModuleWidget[];
  detail_tabs: Record<string, DetailTab[]>;
}

/**
 * Registry frontend: menu + widget + detail_tabs dari SEMUA modul aktif.
 * Token masuk query key -> refetch otomatis saat login/logout.
 */
export function useModuleExtensions() {
  const token = getToken();
  return useQuery({
    queryKey: ["spine", "extensions", token],
    queryFn: async () => {
      const res = await api<ModuleExtensions>("/api/v1/modules/extensions");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat extensions");
      return {
        menu: res.data?.menu ?? [],
        widgets: res.data?.widgets ?? [],
        detail_tabs: res.data?.detail_tabs ?? {},
      };
    },
    enabled: Boolean(token),
  });
}
