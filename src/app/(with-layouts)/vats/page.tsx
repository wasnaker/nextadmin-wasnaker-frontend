"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { can, useAuth } from "@/services/spine/auth-context";
import {
  SmallTable,
  type SmallTableColumn,
} from "@/components/spine/small-table";
import { StatusBadge } from "@/components/spine/status-badge";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { FieldLabel } from "@/components/tailgrids/core/field";
import { Input } from "@/components/tailgrids/core/input";
import { usePaginationLimit } from "@/services/spine/use-pagination-limit";
import { useModuleExtensions } from "@/services/spine/module-extensions";

interface Vat {
  id: number;
  ulid?: string;
  npwp: string;
  name: string | null;
  created_at?: string;
}

const EMPTY_FORM = { npwp: "", name: "" };

/**
 * Vats (NPWP) — modul spine-vat.
 * POLA: visibility panel detail (showDetail) dikontrol di parent page.
 * Klik row panggil onSelectId + setShowDetail(true) (auto-expand).
 * Tombol toggle ◀/▶ ada di toolbar prop (dipanggil oleh SmallTable).
 *
 * Gate: vat:view / vat:manage.
 */
export default function VatsPage() {
  const { token, user: me } = useAuth();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // POLA: state smallView di parent — bukan di SmallTable.
  const [smallView, setSmallView] = useState(true);

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const h = Number(window.location.hash.replace("#", ""));
    return h || null;
  });

  const canView = can(me, "vat:view");
  const canManage = can(me, "vat:manage");

  const { data: items = [], isPending } = useQuery({
    queryKey: ["spine", "vats", token],
    queryFn: async () => {
      const res = await api<{ data: Vat[] }>("/api/v1/vats");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: ext } = useModuleExtensions();
  const tabs = useMemo(
    () =>
      (ext?.detail_tabs["vat"] ?? []).sort(
        (a, b) => (a.position ?? 999) - (b.position ?? 999)
      ),
    [ext]
  );

  const columns: SmallTableColumn<Vat>[] = [
    {
      key: "id",
      label: "ID",
      primary: true,
      render: (it) => <span className="text-text-tertiary">#{it.id}</span>,
    },
    {
      key: "npwp",
      label: "NPWP",
      primary: true,
      render: (it) => (
        <span className="font-mono text-sm text-text-primary">{it.npwp}</span>
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (it) =>
        it.name ? (
          <span className="text-text-secondary">{it.name}</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
  ];

  // POLA: klik row → selectItem + setSmallView(true) (auto-expand).
  function selectItem(id: number | string) {
    const n = Number(id);
    setSelectedId(n);
    window.location.hash = String(n);
    setSmallView(true);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(item: Vat) {
    setEditing(item);
    setForm({ npwp: item.npwp, name: item.name ?? "" });
    setError(null);
    setOpen(true);
  }

  async function onSave() {
    if (!form.npwp.trim()) {
      setError("NPWP wajib diisi");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        npwp: form.npwp.trim(),
        name: form.name.trim() || null,
      };
      const res = await api(
        editing ? `/api/v1/vats/${editing.id}` : "/api/v1/vats",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        setError(res.error ?? "Gagal menyimpan");
        return;
      }
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["spine", "vats"] });
      const savedId = (res.data as Vat).id;
      selectItem(savedId);
      setRefreshKey((k) => k + 1);
    } catch {
      setError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: Vat) {
    if (!window.confirm(`Hapus NPWP ${item.npwp}?`)) return;
    const res = await api(`/api/v1/vats/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(res.error ?? "Gagal menghapus");
      return;
    }
    if (selectedId === item.id) {
      setSelectedId(null);
      window.location.hash = "";
      setSmallView(false);
    }
    await qc.invalidateQueries({ queryKey: ["spine", "vats"] });
    setRefreshKey((k) => k + 1);
  }

  if (!canView) {
    return (
      <p className="text-sm text-text-tertiary">
        Anda tidak memiliki akses ke daftar NPWP.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Vats (NPWP)
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Daftar NPWP/nomor pajak terdaftar. 1 NPWP = 1 baris; module lain
            (Customer, Branch) referensikan via FK.
          </p>
        </div>
        {canManage && <Button onClick={openCreate}>Add NPWP</Button>}
      </div>

      {error && <p className="text-sm text-text-tertiary">{error}</p>}

      {isPending ? (
        <p className="text-sm text-text-tertiary">Memuat...</p>
      ) : (
        <SmallTable
          items={items}
          tabs={tabs}
          columns={columns}
          selectedId={selectedId}
          onSelectId={selectItem}
          getItemId={(it) => it.id}
          // POLA: showDetail dikontrol dari parent state.
          showDetail={smallView}
          refreshKey={refreshKey}
          perPage={perPage}
          getSearchText={(it) => `${it.npwp} ${it.name ?? ""}`}
          tabHideKeys={["ulid", "id", "npwp", "properties"]}
          renderHeader={(it) => (
            <span className="flex items-center gap-2">
              <span className="font-mono text-text-primary">{it.npwp}</span>
              <span className="text-text-tertiary">#{it.id}</span>
            </span>
          )}
          // POLA: tombol toggle ◀/▶ ada di toolbar prop (dipanggil
          // SmallTable di header detail panel), bersama Edit/Delete.
          toolbar={(item) =>
            canManage ? (
              <>
                <Button appearance="outline" onClick={() => openEdit(item)}>
                  Edit
                </Button>
                <Button appearance="outline" onClick={() => onDelete(item)}>
                  Delete
                </Button>
                <Button
                  appearance="outline"
                  onClick={() => setSmallView((v) => !v)}
                >
                  {smallView ? "◀" : "▶"}
                </Button>
              </>
            ) : null
          }
        />
      )}

      {open && (
        <Dialog isOpen={open} onOpenChange={setOpen}>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit NPWP #${editing.id}` : "Add NPWP"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <FieldLabel htmlFor="f-npwp">NPWP</FieldLabel>
              <Input
                id="f-npwp"
                value={form.npwp}
                onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                placeholder="01.234.567.8-901.000"
                className="mt-1.5 w-full font-mono"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-name">Name (opsional)</FieldLabel>
              <Input
                id="f-name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="Label tampilan"
                className="mt-1.5 w-full"
              />
            </div>
            {error && <p className="text-sm text-text-tertiary">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button
              appearance="outline"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Batal
            </Button>
            <Button onClick={onSave} isDisabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
