"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { Skeleton } from "@/components/tailgrids/core/skeleton";
import { StatusBadge } from "./status-badge";
import { useModuleExtensions } from "@/services/spine/module-extensions";

type Tab = {
  slug: string;
  api: string;
};

type Company = {
  code: string;
  name: string;
  type: string;
  email?: string | null;
  address?: string | null;
  is_active?: boolean;
  province?: { name?: string } | null;
  regency?: { name?: string } | null;
  parent?: { code?: string; name?: string } | null;
};

/**
 * Tab Companies — read-only lintas modul (Customer + branch dari tabel
 * customers yang province/regency-nya cocok dengan agency/unit ini).
 * Data datang dari GET /api/v1/agencies/{id}/companies.
 */
export function CompaniesTab({ item, tab }: { item: { id: number }; tab?: Tab | null }) {
  const { data: ext } = useModuleExtensions();
  const url =
    tab?.api?.replace("{id}", String(item.id)) ??
    `/api/v1/agencies/${item.id}/companies`;
  const { data, isPending, isError } = useQuery({
    queryKey: ["spine", "companies", item.id],
    queryFn: async () => {
      const res = await api<{ data?: Company[] }>(url);
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    // Denyut fix (sama dgn TabContent): ganti agency/record -> data sebelumnya
    // tetap tampil sebagai placeholder selama fetch. Tidak ada fase skeleton.
    placeholderData: (prev) => prev,
  });

  if (isPending) {
    return (
      <div className="space-y-3">
        {[90, 70, 85, 60].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }
  if (isError || !data) {
    return <p className="text-sm text-text-tertiary">Gagal memuat companies.</p>;
  }
  if (data.length === 0) {
    return <p className="text-sm text-text-tertiary">Tidak ada company di wilayah ini.</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((c, i) => (
        <div
          key={`${c.type}-${c.code}-${i}`}
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border-primary px-4 py-2.5"
        >
          <span className="font-mono text-sm text-text-primary">{c.code}</span>
          <span className="min-w-40 flex-1 font-medium text-text-primary">
            {c.name}
            {c.type === "branch" && c.parent ? (
              <span className="ml-2 text-xs text-text-tertiary">
                (cabang {c.parent.code} {c.parent.name})
              </span>
            ) : null}
          </span>
          <span className="text-xs">
            {c.type === "branch" ? (
              <StatusBadge status="branch" />
            ) : (
              <StatusBadge status="customer" />
            )}
          </span>
          {c.email ? (
            <span className="text-xs text-text-secondary">{c.email}</span>
          ) : null}
          <span className="text-xs text-text-tertiary">
            {c.regency?.name ?? "—"}, {c.province?.name ?? "—"}
          </span>
        </div>
      ))}
      <p className="pt-1 text-xs text-text-tertiary">
        Menampilkan {data.length} entitas (customer + branch) yang terdaftar di wilayah ini.
        Data berasal dari modul Customer — bersifat read-only.
      </p>
    </div>
  );
}
