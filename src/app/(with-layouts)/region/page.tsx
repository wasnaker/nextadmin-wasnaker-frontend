"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { can, useAuth } from "@/services/spine/auth-context";
import {
  SmallTable,
  type SmallTableColumn,
} from "@/components/spine/small-table";
import { Button } from "@/components/tailgrids/core/button";

interface ProvinceRow {
  id: number;
  code: string;
  name: string;
}

interface RegencyRow {
  id: number;
  code: string;
  name: string;
  province_id?: number;
}

/** Overview tab payload — inline dari selected province. */
interface ProvinceOverview {
  id: number;
  code: string;
  name: string;
  regencies_count?: number;
}

const EMPTY_OVERVIEW = {
  id: 0,
  code: "",
  name: "",
  regencies_count: 0,
};

export default function RegionPage() {
  const { token, user: me } = useAuth();
  const qc = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);

  // POLA: state smallView di parent — bukan di SmallTable.
  const [smallView, setSmallView] = useState(true);

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const h = Number(window.location.hash.replace("#", ""));
    return h || null;
  });

  const canView = can(me, "region:view");

  const { data: items = [], isPending } = useQuery<ProvinceRow[]>({
    queryKey: ["spine", "region", "provinces", token],
    queryFn: async () => {
      const res = await api<{ data: ProvinceRow[] }>("/api/v1/provinces");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat provinsi");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const columns: SmallTableColumn<ProvinceRow>[] = [
    {
      key: "code",
      label: "Code",
      primary: true,
      render: (it) => (
        <span className="font-mono text-sm text-text-primary">{it.code}</span>
      ),
    },
    {
      key: "name",
      label: "Name",
      primary: true,
      render: (it) => (
        <span className="font-medium text-text-primary">{it.name}</span>
      ),
    },
  ];

  const overviewQuery = useQuery<ProvinceOverview>({
    queryKey: ["spine", "region", "province", token, selectedId],
    queryFn: async () => {
      if (!selectedId) return EMPTY_OVERVIEW;
      const res = await api<{ data: ProvinceOverview }>(
        `/api/v1/provinces/${selectedId}`
      );
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat provinsi");
      return res.data?.data ?? EMPTY_OVERVIEW;
    },
    enabled: Boolean(token) && canView && Boolean(selectedId),
  });

  const regenciesQuery = useQuery<RegencyRow[]>({
    queryKey: ["spine", "region", "regencies", token, selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const res = await api<{ data: RegencyRow[] }>(
        `/api/v1/regencies?province_id=${selectedId}`
      );
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat kabupaten");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView && Boolean(selectedId),
  });

  // POLA: klik row → selectItem + setSmallView(true) (auto-expand).
  function selectItem(id: number | string) {
    const n = Number(id);
    setSelectedId(n);
    window.location.hash = String(n);
    setSmallView(true);
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Region
        </h1>
        <p className="text-sm text-text-tertiary">
          Anda tidak memiliki akses ke data wilayah.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Region
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Data referensi wilayah administrasi Indonesia (read-only).
          </p>
        </div>
        <Button
          appearance="outline"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["spine", "region"] });
            setRefreshKey((k) => k + 1);
          }}
        >
          Refresh
        </Button>
      </div>

      {isPending ? (
        <p className="text-sm text-text-tertiary">Memuat...</p>
      ) : (
        <SmallTable
          items={items}
          tabs={
            selectedId
              ? [
                  {
                    slug: "overview",
                    label: "Overview",
                    icon: "👁️",
                    api: `/api/v1/provinces/{id}`,
                    position: 10,
                  },
                  {
                    slug: "regencies",
                    label: "Regencies",
                    icon: "🏙️",
                    api: `/api/v1/regencies?province_id={id}`,
                    position: 20,
                  },
                ]
              : []
          }
          columns={columns}
          selectedId={selectedId}
          onSelectId={selectItem}
          getItemId={(it) => it.id}
          showDetail={smallView}
          refreshKey={refreshKey}
          getSearchText={(it) => `${it.code} ${it.name}`}
          tabHideKeys={["ulid", "province_id", "created_at", "updated_at", "deleted_at"]}
          tabCustomValue={{
            regencies: (val: unknown) => {
              const list = val as RegencyRow[] | undefined;
              if (!list?.length) return <span className="text-text-tertiary">—</span>;
              return (
                <div className="space-y-1">
                  {list.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm odd:bg-card-surface-area"
                    >
                      <span className="w-10 font-mono text-xs text-text-tertiary">
                        {r.code}
                      </span>
                      <span className="text-text-primary">{r.name}</span>
                    </div>
                  ))}
                </div>
              );
            },
          }}
          renderHeader={(it) => (
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-text-tertiary">
                {it.code}
              </span>
              <span className="text-text-primary">{it.name}</span>
            </span>
          )}
          toolbar={() => (
            <Button
              appearance="outline"
              onClick={() => setSmallView((v) => !v)}
            >
              {smallView ? "◀" : "▶"}
            </Button>
          )}
        />
      )}
    </div>
  );
}
