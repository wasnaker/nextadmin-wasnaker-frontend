"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { can, useAuth } from "@/services/spine/auth-context";
import {
  SmallTable,
  type SmallTableColumn,
  type SmallTableProps,
} from "@/components/spine/small-table";
import type { DetailTab } from "@/services/spine/module-extensions";
import { StatusBadge } from "@/components/spine/status-badge";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { Input } from "@/components/tailgrids/core/input";
import { usePaginationLimit } from "@/services/spine/use-pagination-limit";

interface ConnectionParty {
  id: number;
  code: string;
  name: string;
  type?: string;
  parent?: { code: string; name: string } | null;
}

interface ConnectionRow {
  id: number;
  token: string;
  status: string;
  customer?: ConnectionParty | null;
  surveyor?: ConnectionParty | null;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
}

function partyLabel(p: ConnectionParty | null | undefined): string {
  if (!p) return "—";
  const parent = p.parent ? ` (${p.parent.code} ${p.parent.name})` : "";
  return `${p.code} ${p.name}${parent}`;
}

/**
 * Connections — relasi customer <-> surveyor via invite link.
 * List milik entity aktif (dari user login). Generate link -> dialog berisi
 * URL yang dikirim ke pihak lawan di luar aplikasi.
 */
export default function ConnectionsPage() {
  const { token, user: me } = useAuth();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();
  const [refreshKey, setRefreshKey] = useState(0);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [smallView, setSmallView] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // POLA: klik row → select + auto-expand panel detail.
  function selectItem(id: number | string) {
    const n = Number(id);
    setSelectedId(n);
    window.location.hash = String(n);
    setSmallView(true);
  }

  const detailTabs: DetailTab[] = useMemo(
    () => [
      { slug: "overview", label: "Detail", icon: "ℹ️", position: 0, api: "" },
    ],
    []
  );

  const tabCustomValue: SmallTableProps<ConnectionRow>["tabCustomValue"] =
    useMemo(
      () => ({
        customer: (v) => <span>{partyLabel(v as ConnectionParty | null)}</span>,
        surveyor: (v) => (
          <span>{partyLabel(v as ConnectionParty | null)}</span>
        ),
        status: (v) => <StatusBadge status={String(v)} />,
        created_by: (v, row) => (
          <span>
            {(row.creator as { name?: string } | null)?.name ?? "—"}
          </span>
        ),
        approved_by: (v, row) => (
          <span>
            {(row.approver as { name?: string } | null)?.name ?? "—"}
          </span>
        ),
        token: (v) => (
          <span className="break-all font-mono text-xs">{String(v)}</span>
        ),
        created_at: (v) =>
          v ? new Date(String(v)).toLocaleString("id-ID") : null,
        approved_at: (v) =>
          v ? new Date(String(v)).toLocaleString("id-ID") : null,
      }),
      []
    );

  const canView = can(me, "connection:view");
  const canCreate = can(me, "connection:create");
  const canCancel = can(me, "connection:cancel");

  const { data: items = [], isPending } = useQuery({
    queryKey: ["spine", "connections", token],
    queryFn: async () => {
      const res = await api<{ data: ConnectionRow[] }>("/api/v1/connections");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  async function onGenerate() {
    setCreating(true);
    setError(null);
    try {
      const res = await api<{ token: string }>("/api/v1/connections", {
        method: "POST",
      });
      if (!res.ok) {
        setError(res.error ?? "Gagal membuat link");
        return;
      }
      const token2 = (res.data as { token?: string }).token;
      if (!token2) {
        setError("Respon tidak berisi token");
        return;
      }
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setLinkUrl(`${origin}/connect/${token2}`);
      setCopied(false);
      await qc.invalidateQueries({ queryKey: ["spine", "connections"] });
    } catch {
      setError("Gagal membuat link");
    } finally {
      setCreating(false);
    }
  }

  async function onCancel(item: ConnectionRow) {
    if (!window.confirm("Batalkan link pending ini?")) return;
    const res = await api(`/api/v1/connections/${item.id}/cancel`, {
      method: "POST",
    });
    if (!res.ok) {
      setError(res.error ?? "Gagal membatalkan");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["spine", "connections"] });
    setRefreshKey((k) => k + 1);
  }

  async function onCopy() {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const columns: SmallTableColumn<ConnectionRow>[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        render: (it) => <StatusBadge status={it.status} />,
      },
      {
        key: "customer",
        label: "Customer",
        primary: true,
        render: (it) => (
          <span className="text-text-primary">{partyLabel(it.customer)}</span>
        ),
      },
      {
        key: "surveyor",
        label: "Surveyor",
        primary: true,
        render: (it) => (
          <span className="text-text-primary">{partyLabel(it.surveyor)}</span>
        ),
      },
      {
        key: "created_at",
        label: "Dibuat",
        render: (it) => (
          <span className="text-text-tertiary">
            {it.created_at ? new Date(it.created_at).toLocaleString("id-ID") : "—"}
          </span>
        ),
      },
    ],
    []
  );

  if (!canView) {
    return (
      <p className="text-sm text-text-tertiary">
        Anda tidak memiliki akses ke Connections.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Connections
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Hubungan customer ↔ surveyor. Generate link lalu kirim ke pihak
            lawan (email/WA/kertas) — koneksi aktif setelah link di-approve.
          </p>
        </div>
        {canCreate && (
          <Button onClick={onGenerate} isDisabled={creating}>
            {creating ? "Membuat..." : "Generate Link"}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-text-tertiary">{error}</p>}

      {isPending ? (
        <p className="text-sm text-text-tertiary">Memuat...</p>
      ) : (
        <SmallTable
          items={items}
          tabs={detailTabs}
          columns={columns}
          selectedId={selectedId}
          onSelectId={selectItem}
          getItemId={(it) => it.id}
          // POLA: showDetail dikontrol dari parent state.
          showDetail={smallView}
          refreshKey={refreshKey}
          perPage={perPage}
          getSearchText={(it) =>
            `${it.customer?.code ?? ""} ${it.customer?.name ?? ""} ${it.surveyor?.code ?? ""} ${it.surveyor?.name ?? ""}`
          }
          tabHideKeys={[
            "id",
            "ulid",
            "token",
            "customer_id",
            "surveyor_id",
            "creator",
            "approver",
          ]}
          tabCustomValue={tabCustomValue}
          renderHeader={(it) => (
            <span className="flex items-center gap-2">
              <StatusBadge status={it.status} />
              <span className="font-mono text-xs text-text-tertiary">
                #{it.id}
              </span>
            </span>
          )}
          toolbar={(item) => (
            <>
              {item.status === "pending" && canCancel && (
                <Button appearance="outline" onClick={() => onCancel(item)}>
                  Batalkan
                </Button>
              )}
              <Button
                appearance="outline"
                onClick={() => setSmallView((v) => !v)}
              >
                {smallView ? "◀" : "▶"}
              </Button>
            </>
          )}
          emptyText="Belum ada connection."
        />
      )}

      {linkUrl && (
        <Dialog isOpen onOpenChange={(v) => !v && setLinkUrl(null)}>
          <DialogHeader>
            <DialogTitle>Link Koneksi</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-text-secondary">
              Kirim link ini ke pihak yang ingin kamu hubungi. Koneksi aktif
              setelah mereka buka link dan approve.
            </p>
            <Input readOnly value={linkUrl} className="w-full font-mono" />
          </DialogBody>
          <DialogFooter>
            <Button appearance="outline" onClick={() => setLinkUrl(null)}>
              Tutup
            </Button>
            <Button onClick={onCopy}>{copied ? "Tersalin ✓" : "Salin Link"}</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
