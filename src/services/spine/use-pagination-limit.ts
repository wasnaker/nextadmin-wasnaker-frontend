"use client";

import { useQuery } from "@tanstack/react-query";
import { api, getToken } from "./api";
import { can, useAuth } from "./auth-context";

/**
 * Setting `tables_pagination_limit` (default 10). 404/error = default.
 * Query key global -> sekali fetch, dipakai semua halaman.
 *
 * Endpoint settings di-restrict (`spine.settings.restrict=true`, butuh
 * permission settings:view — hanya role admin). User non-admin tidak
 * fetch -> default 10 (hindari 403 di console tiap halaman).
 */
export function usePaginationLimit(): number {
  const token = getToken();
  const { user } = useAuth();
  const allowed = can(user, "settings:view");
  const { data } = useQuery({
    queryKey: ["spine", "settings", "tables_pagination_limit", token],
    queryFn: async () => {
      const res = await api<{ value?: string | number }>(
        "/api/v1/settings/tables_pagination_limit"
      );
      const v = Number(res.data?.value ?? 10);
      return v > 0 ? v : 10;
    },
    enabled: Boolean(token) && allowed,
  });
  return data ?? 10;
}
