"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { can, useAuth } from "@/services/spine/auth-context";
import { Card } from "@/components/tailgrids/core/card";
import { cn } from "@/utils/cn";

interface Province {
  id: number;
  code: string;
  name: string;
}

interface Regency {
  id: number;
  code: string;
  name: string;
}

/**
 * Region — data referensi wilayah Indonesia (read-only).
 * List provinsi (kiri) → klik → kabupaten/kota provinsi tsb (kanan).
 * Gate: permission region:view (backend route + guard halaman).
 */
export default function RegionPage() {
  const { token, user } = useAuth();
  const canView = can(user, "region:view");
  const [selected, setSelected] = useState<Province | null>(null);

  const provincesQ = useQuery({
    queryKey: ["spine", "region", "provinces", token],
    queryFn: async () => {
      const res = await api<{ data: Province[] }>("/api/v1/provinces");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat provinsi");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const regenciesQ = useQuery({
    queryKey: ["spine", "region", "regencies", token, selected?.id],
    queryFn: async () => {
      const res = await api<{ data: Regency[] }>(
        `/api/v1/regencies?province_id=${selected?.id}`
      );
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat kabupaten");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView && Boolean(selected),
  });

  if (!canView) {
    return (
      <p className="text-sm text-text-tertiary">
        Anda tidak memiliki akses ke data wilayah.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Region
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Data referensi wilayah administrasi Indonesia (read-only).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Provinsi */}
        <Card className="bg-transparent p-5">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">
            Provinsi ({provincesQ.data?.length ?? "…"})
          </h2>
          {provincesQ.isPending ? (
            <p className="text-sm text-text-tertiary">Memuat…</p>
          ) : (
            <ul className="max-h-105 space-y-1 overflow-y-auto pr-1">
              {(provincesQ.data ?? []).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(p)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      selected?.id === p.id
                        ? "bg-primary-50 text-primary-700"
                        : "text-text-primary hover:bg-background-gray-primary",
                    )}
                  >
                    <span className="w-10 shrink-0 font-mono text-xs text-text-tertiary">
                      {p.code}
                    </span>
                    <span className="font-medium">{p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Kabupaten/kota provinsi terpilih */}
        <Card className="bg-transparent p-5">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">
            {selected
              ? `Kabupaten/Kota — ${selected.name} (${regenciesQ.data?.length ?? "…"})`
              : "Kabupaten/Kota"}
          </h2>
          {!selected ? (
            <p className="text-sm text-text-tertiary">
              Pilih provinsi untuk melihat kabupaten/kota-nya.
            </p>
          ) : regenciesQ.isPending ? (
            <p className="text-sm text-text-tertiary">Memuat…</p>
          ) : (
            <ul className="max-h-105 space-y-1 overflow-y-auto pr-1">
              {(regenciesQ.data ?? []).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                >
                  <span className="w-10 shrink-0 font-mono text-xs text-text-tertiary">
                    {r.code}
                  </span>
                  <span className="text-text-primary">{r.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
