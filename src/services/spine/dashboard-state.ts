"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getToken } from "./api";

/**
 * State dashboard per user — kontrak Spine:
 *   GET  /api/v1/dashboard              -> {layout, visibility} (null = default)
 *   PUT  /api/v1/dashboard/order        -> {layout: {area: [id,...] | "empty"}}
 *   PUT  /api/v1/dashboard/visibility   -> {widgets: [{id, visible: 0|1}]}
 *   POST /api/v1/dashboard/reset        -> hapus state -> balik default manifest
 *
 * layout: Record<area, string[]> | null  (area kosong diwakili [])
 * visibility: Record<widgetId, boolean> | null  (absen = tampil)
 * Merge ke urutan render: resolveDashboardLayout() di components/dashboard/dashboard-merge.
 */

export interface DashboardState {
  layout: Record<string, string[]> | null;
  visibility: Record<string, boolean> | null;
}

/** Key cache react-query HARUS exact (termasuk token) agar optimistic update
 *  (onMutate/onSuccess/rollback) mengenai query yang sama dgn useDashboardState. */
function dashboardKey() {
  return ["spine", "dashboard", getToken()] as const;
}

export function useDashboardState() {
  const token = getToken();
  return useQuery({
    queryKey: dashboardKey(),
    queryFn: async () => {
      const res = await api<{ data: DashboardState }>("/api/v1/dashboard");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat state dashboard");
      return res.data?.data ?? { layout: null, visibility: null };
    },
    enabled: Boolean(token),
  });
}

/** Serialize layout utk PUT: array kosong -> "empty" (paritas legacy). */
export function serializeLayout(layout: Record<string, string[]>): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [area, ids] of Object.entries(layout)) {
    out[area] = ids.length === 0 ? "empty" : ids;
  }
  return out;
}

/**
 * Simpan posisi widget — optimistic terhadap cache; dipanggil per drop dgn
 * state PENUH. Gagal -> rollback cache + error dilempar (pemanggil toast).
 */
export function useSaveDashboardLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (layout: Record<string, string[]>) => {
      const res = await api("/api/v1/dashboard/order", {
        method: "PUT",
        body: JSON.stringify({ layout: serializeLayout(layout) }),
      });
      if (!res.ok) throw new Error(res.error ?? "Gagal menyimpan layout");
      return res;
    },
    onMutate: async (layout) => {
      await qc.cancelQueries({ queryKey: ["spine", "dashboard"] });
      const key = dashboardKey();
      const prev = qc.getQueryData<DashboardState>(key);
      qc.setQueryData<DashboardState>(key, (old) => ({
        layout,
        visibility: old?.visibility ?? null,
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData<DashboardState>(dashboardKey(), ctx.prev);
      }
    },
  });
}

/** Simpan visibility — kontrak Spine: {widgets: [{id, visible: 0|1}]}. */
export function useSaveDashboardVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (visibility: Record<string, boolean>) => {
      const widgets = Object.entries(visibility).map(([id, visible]) => ({
        id,
        visible: visible ? 1 : 0,
      }));
      const res = await api("/api/v1/dashboard/visibility", {
        method: "PUT",
        body: JSON.stringify({ widgets }),
      });
      if (!res.ok) throw new Error(res.error ?? "Gagal menyimpan visibilitas");
      return res;
    },
    onMutate: async (visibility) => {
      await qc.cancelQueries({ queryKey: ["spine", "dashboard"] });
      const key = dashboardKey();
      const prev = qc.getQueryData<DashboardState>(key);
      qc.setQueryData<DashboardState>(key, (old) => ({
        layout: old?.layout ?? null,
        visibility,
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData<DashboardState>(dashboardKey(), ctx.prev);
      }
    },
  });
}

/** Reset layout + visibility ke default manifest. */
export function useResetDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api("/api/v1/dashboard/reset", { method: "POST" });
      if (!res.ok) throw new Error(res.error ?? "Gagal reset dashboard");
      return res;
    },
    onSuccess: () => {
      qc.setQueryData<DashboardState>(dashboardKey(), {
        layout: null,
        visibility: null,
      });
    },
  });
}
