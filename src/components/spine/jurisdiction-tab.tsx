"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { Button } from "@/components/tailgrids/core/button";
import { FieldLabel } from "@/components/tailgrids/core/field";
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";

interface RegencyRef {
  id: number;
  name: string;
  province?: { id: number; name: string } | null;
}

interface JurisdictionRow {
  id: number;
  unit_id: number;
  regency_id: number;
  regency?: RegencyRef | null;
}

interface AgencyRow {
  id: number;
  type: string;
  name: string;
  parent_id?: number | null;
}

const UNIT_ROWS_PER_PAGE = 100;

/**
 * Tab Jurisdictions — kelola wilayah kerja sebuah Unit.
 * Hanya bermakna saat baris terpilih type='unit' (Disnaker tidak punya wilayah).
 * 1 regency = 1 unit (unik global); pindah wilayah = move atomik.
 */
export function JurisdictionTab({ item }: { item: AgencyRow }) {
  const qc = useQueryClient();
  const isUnit = item.type === "unit";

  const { data: rows = [] } = useQuery({
    queryKey: ["spine", "jurisdictions", item.id],
    queryFn: async () => {
      const res = await api<{ data: JurisdictionRow[] }>(
        `/api/v1/agencies/${item.id}/jurisdictions`
      );
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(isUnit),
  });

  const { data: available = [] } = useQuery({
    queryKey: ["spine", "jurisdictions-available", item.id],
    queryFn: async () => {
      const res = await api<{ data: RegencyRef[] }>(
        `/api/v1/agencies/${item.id}/jurisdictions?available=1`
      );
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(isUnit),
  });

  const { data: siblingUnits = [] } = useQuery({
    queryKey: ["spine", "units-of", item.parent_id],
    queryFn: async () => {
      const res = await api<{ data: AgencyRow[] }>(
        `/api/v1/agencies/${item.parent_id}/units`
      );
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(isUnit) && Boolean(item.parent_id),
  });

  const [addSel, setAddSel] = useState<string>("");
  const [moveReg, setMoveReg] = useState<string>("");
  const [moveTo, setMoveTo] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  const myRegIds = useMemo(
    () => new Set(rows.map((r) => r.regency_id)),
    [rows]
  );
  const addOptions = available.filter((r) => !myRegIds.has(r.id));
  const moveOptions = rows.filter((r) => r.regency);
  const targets = siblingUnits.filter((u) => u.id !== item.id);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["spine", "jurisdictions"] });

  async function onAdd() {
    if (!addSel) return;
    setErr(null);
    const res = await api(`/api/v1/agencies/${item.id}/jurisdictions`, {
      method: "POST",
      body: JSON.stringify({ regency_ids: [Number(addSel)] }),
    });
    if (!res.ok) {
      setErr(res.error ?? "Gagal menambah");
      return;
    }
    setAddSel("");
    await invalidate();
  }

  async function onRemove(regId: number, name: string) {
    if (!window.confirm(`Lepas ${name} dari unit ini?`)) return;
    setErr(null);
    const res = await api(
      `/api/v1/agencies/${item.id}/jurisdictions/${regId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      setErr(res.error ?? "Gagal melepas");
      return;
    }
    await invalidate();
  }

  async function onMove() {
    if (!moveReg || !moveTo) return;
    setErr(null);
    const res = await api(`/api/v1/agencies/jurisdictions/move`, {
      method: "POST",
      body: JSON.stringify({
        regency_id: Number(moveReg),
        from_unit_id: item.id,
        to_unit_id: Number(moveTo),
      }),
    });
    if (!res.ok) {
      setErr(res.error ?? "Gagal memindah");
      return;
    }
    setMoveReg("");
    setMoveTo("");
    await invalidate();
  }

  if (!isUnit) {
    return (
      <p className="text-sm text-text-tertiary">
        Jurisdiction adalah wilayah kerja Unit. Pilih baris Unit (type=unit)
        untuk mengelola wilayah kerjanya.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Daftar wilayah kerja sekarang */}
      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">
          Wilayah kerja unit ini ({rows.length})
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            Belum ada wilayah kerja. Tambahkan dari daftar kab/kota di bawah.
          </p>
        ) : (
          <ul className="divide-y divide-card-border rounded-lg border border-card-border">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="text-text-primary">{r.regency?.name ?? `#${r.regency_id}`}</span>
                <Button
                  appearance="outline"
                  onClick={() => onRemove(r.regency_id, r.regency?.name ?? String(r.regency_id))}
                >
                  Lepas
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tambah wilayah kerja */}
      <div className="rounded-lg border border-card-border p-4">
        <p className="mb-2 text-sm font-medium text-text-secondary">
          Tambah wilayah kerja (kab/kota yang belum dipakai unit lain)
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <FieldLabel>Kabupaten/Kota</FieldLabel>
            <Select
              value={addSel}
              onChange={(v) => setAddSel(String(v ?? ""))}
            >
              <SelectLabel>Kabupaten/Kota</SelectLabel>
              <SelectTrigger
                className="mt-1 w-full border-border-secondary bg-input-background py-2.5"
                isDisabled={addOptions.length === 0}
              >
                <SelectValue />
                <SelectIndicator />
              </SelectTrigger>
              <SelectContent className="min-w-(--trigger-width)">
                {addOptions.length === 0 && (
                  <p className="px-3 py-2 text-sm text-text-tertiary">
                    Tidak ada wilayah tersisa untuk ditambahkan.
                  </p>
                )}
                {addOptions.map((r) => (
                  <SelectItem key={r.id} id={String(r.id)} textValue={r.name}>
                    {r.name}
                    {r.province && (
                      <span className="ml-2 text-xs text-text-tertiary">
                        {r.province.name}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onAdd} isDisabled={!addSel}>
            Tambah
          </Button>
        </div>
      </div>

      {/* Pindahkan wilayah kerja ke unit lain */}
      <div className="rounded-lg border border-card-border p-4">
        <p className="mb-2 text-sm font-medium text-text-secondary">
          Pindahkan wilayah ke unit lain (satu langkah, atomik)
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <FieldLabel>Wilayah</FieldLabel>
            <Select value={moveReg} onChange={(v) => setMoveReg(String(v ?? ""))}>
              <SelectLabel>Wilayah</SelectLabel>
              <SelectTrigger className="mt-1 w-full border-border-secondary bg-input-background py-2.5">
                <SelectValue />
                <SelectIndicator />
              </SelectTrigger>
              <SelectContent className="min-w-(--trigger-width)">
                {moveOptions.length === 0 && (
                  <p className="px-3 py-2 text-sm text-text-tertiary">
                    Unit ini belum punya wilayah untuk dipindah.
                  </p>
                )}
                {moveOptions.map((r) => (
                  <SelectItem key={r.id} id={String(r.regency_id)} textValue={r.regency?.name ?? ""}>
                    {r.regency?.name ?? `#${r.regency_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-48 flex-1">
            <FieldLabel>Pindah ke Unit</FieldLabel>
            <Select value={moveTo} onChange={(v) => setMoveTo(String(v ?? ""))}>
              <SelectLabel>Pindah ke Unit</SelectLabel>
              <SelectTrigger className="mt-1 w-full border-border-secondary bg-input-background py-2.5">
                <SelectValue />
                <SelectIndicator />
              </SelectTrigger>
              <SelectContent className="min-w-(--trigger-width)">
                {targets.length === 0 && (
                  <p className="px-3 py-2 text-sm text-text-tertiary">
                    Tidak ada unit lain dalam Disnaker yang sama.
                  </p>
                )}
                {targets.map((u) => (
                  <SelectItem key={u.id} id={String(u.id)} textValue={u.name}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onMove} isDisabled={!moveReg || !moveTo}>
            Pindahkan
          </Button>
        </div>
      </div>

      {err && <p className="text-sm text-text-tertiary">{err}</p>}
    </div>
  );
}
