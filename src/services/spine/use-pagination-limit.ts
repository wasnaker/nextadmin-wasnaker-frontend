"use client";

import { useQuery } from "@tanstack/react-query";
import { api, getToken } from "./api";

/**
 * Setting `tables_pagination_limit` (default 10). 404/error = default.
 * Query key global -> sekali fetch, dipakai semua halaman.
 */
export function usePaginationLimit(): number {
  const token = getToken();
  const { data } = useQuery({
    queryKey: ["spine", "settings", "tables_pagination_limit", token],
    queryFn: async () => {
      const res = await api<{ value?: string | number }>(
        "/api/v1/settings/tables_pagination_limit"
      );
      const v = Number(res.data?.value ?? 10);
      return v > 0 ? v : 10;
    },
    enabled: Boolean(token),
  });
  return data ?? 10;
}
