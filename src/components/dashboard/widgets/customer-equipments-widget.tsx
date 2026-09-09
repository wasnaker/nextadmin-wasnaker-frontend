"use client";

import { useQuery } from "@tanstack/react-query";
import { api, getToken } from "@/services/spine/api";
import { StatusBadge } from "@/components/spine/status-badge";

interface CustomerEquipmentRecord {
  id: number;
  unit_code?: string | null;
  unit_name: string;
  status?: string | null;
  equipment?: { id: number; code: string; name: string } | null;
}

/**
 * Widget My Equipment — equipment milik customer (customer_equipments).
 * Paritas legacy dashboard; scoping entity dikerjakan backend
 * (CustomerEquipmentController): customer entity hanya lihat punya sendiri.
 */
export function CustomerEquipmentsWidget({ apiPath }: { apiPath: string }) {
  const token = getToken();
  const { data = [], isPending } = useQuery({
    queryKey: ["spine", "customer-equipments-widget", apiPath, token],
    queryFn: async () => {
      const res = await api<{ data: CustomerEquipmentRecord[] }>(apiPath);
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat My Equipment");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token),
  });

  if (isPending) {
    return <p className="text-sm text-text-tertiary">Memuat…</p>;
  }

  if (data.length === 0) {
    return <p className="text-sm text-text-tertiary">Belum ada equipment terdaftar.</p>;
  }

  return (
    <ul className="divide-y divide-card-border rounded-lg border border-card-border">
      {data.slice(0, 5).map((r) => (
        <li
          key={r.id}
          className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm"
        >
          <span className="truncate text-text-primary">
            {r.unit_name}
            {r.equipment?.name && r.equipment.name !== r.unit_name && (
              <span className="ml-2 text-xs text-text-tertiary">{r.equipment.name}</span>
            )}
          </span>
          {r.status ? <StatusBadge status={r.status} /> : <span className="text-xs text-text-tertiary">#{r.id}</span>}
        </li>
      ))}
    </ul>
  );
}
