"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { can, useAuth } from "@/services/spine/auth-context";
import { Button } from "@/components/tailgrids/core/button";
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";

interface PengawasOption {
  id: number;
  name: string;
  email: string;
}

interface AssignedPengawas {
  id: number;
  name: string;
  email: string;
}

/**
 * PengawasTab — tab "Pengawas" di detail Customer/Branch.
 * Menampilkan pengawas ter-assign; role dengan pengawas:assign bisa
 * menambah/menghapus via multi-select (sync many-to-many).
 */
export function PengawasTab({ customerId }: { customerId: number }) {
  const { token, user: me } = useAuth();
  const qc = useQueryClient();
  const canAssign = can(me, "pengawas:assign");
  const [pick, setPick] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: assigned = [], isPending } = useQuery({
    queryKey: ["spine", "customer-pengawas", customerId, token],
    queryFn: async () => {
      const res = await api<{ data: AssignedPengawas[] }>(
        `/api/v1/customers/${customerId}/pengawas`
      );
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token),
    placeholderData: (prev) => prev,
  });

  const { data: options = [] } = useQuery({
    queryKey: ["spine", "pengawas-options", token],
    queryFn: async () => {
      const res = await api<{ data: PengawasOption[] }>(
        "/api/v1/agencies/pengawas/options"
      );
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat opsi");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canAssign,
  });

  const assignedIds = new Set(assigned.map((p) => p.id));
  const available = options.filter((o) => !assignedIds.has(o.id));

  async function save(nextIds: number[]) {
    setBusy(true);
    setErr(null);
    try {
      const res = await api(`/api/v1/customers/${customerId}/pengawas`, {
        method: "PUT",
        body: JSON.stringify({ pengawas_ids: nextIds }),
      });
      if (!res.ok) {
        setErr(res.error ?? "Gagal menyimpan");
        return;
      }
      setPick("");
      await qc.invalidateQueries({
        queryKey: ["spine", "customer-pengawas", customerId],
      });
    } catch {
      setErr("Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  if (isPending) return <p className="text-sm text-text-tertiary">Memuat...</p>;

  return (
    <div className="space-y-3">
      {err && <p className="text-sm text-text-tertiary">{err}</p>}

      {assigned.length === 0 ? (
        <p className="text-sm text-text-tertiary">
          Belum ada pengawas ter-assign.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {assigned.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-primary bg-card-secondary px-2.5 py-1 text-xs text-text-primary"
            >
              {p.name}
              {canAssign && (
                <button
                  type="button"
                  aria-label={`Hapus ${p.name}`}
                  disabled={busy}
                  onClick={() =>
                    save(assigned.filter((x) => x.id !== p.id).map((x) => x.id))
                  }
                  className="ml-1 rounded-full px-1 text-text-tertiary hover:text-red-600"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {canAssign && (
        <div className="flex items-center gap-2">
          <Select value={pick} onChange={(v) => setPick(String(v ?? ""))} className="w-full">
            <SelectLabel>Tambahkan pengawas</SelectLabel>
            <SelectTrigger className="w-full border-border-secondary bg-input-background py-2.5">
              <SelectValue />
              <SelectIndicator />
            </SelectTrigger>
            <SelectContent className="min-w-(--trigger-width)">
              {available.length === 0 ? (
                <SelectItem id="none" textValue="Semua sudah ditambahkan">
                  Semua sudah ditambahkan
                </SelectItem>
              ) : (
                available.map((o) => (
                  <SelectItem key={o.id} id={String(o.id)} textValue={`${o.name} · ${o.email}`}>
                    {o.name} · {o.email}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            appearance="fill"
            size="sm"
            isDisabled={!pick || busy}
            onPress={() => {
              const id = Number(pick);
              if (id) save([...assigned.map((p) => p.id), id]);
            }}
            className="h-9 shrink-0"
          >
            Tambah
          </Button>
        </div>
      )}
    </div>
  );
}