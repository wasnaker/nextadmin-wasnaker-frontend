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
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { usePaginationLimit } from "@/services/spine/use-pagination-limit";
import { useModuleExtensions } from "@/services/spine/module-extensions";

interface ReferralCode {
  id: number;
  user_id: number;
  code: string;
  is_active: boolean;
  terms_accepted_at?: string | null;
  terms_version?: string | null;
  created_at?: string;
  user?: { id: number; name: string; email: string } | null;
}

interface ReferralRow {
  id: number;
  referrer_id: number;
  referred_id: number;
  referral_code_id: number;
  status: string;
  registered_at?: string;
  referrer?: { id: number; name: string } | null;
  referred?: { id: number; name: string } | null;
  code?: { id: number; code: string } | null;
}

interface CommissionRule {
  id: number;
  name: string;
  type: string;
  value: string | number;
  is_active: boolean;
}

const EMPTY_TERMS = { accept_terms: false };

export default function ReferralsPage() {
  const { token, user: me } = useAuth();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [terms, setTerms] = useState(EMPTY_TERMS);

  const [smallView, setSmallView] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const h = Number(window.location.hash.replace("#", ""));
    return h || null;
  });

  const canView = can(me, "referral:view");

  const { data: items = [], isPending } = useQuery({
    queryKey: ["spine", "referral-codes", token],
    queryFn: async () => {
      const res = await api<{ data: ReferralCode[] }>("/api/v1/referral-codes");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: ext } = useModuleExtensions();
  const tabs = useMemo(
    () =>
      (ext?.detail_tabs["referral"] ?? []).sort(
        (a, b) => (a.position ?? 999) - (b.position ?? 999)
      ),
    [ext]
  );

  const { data: referrals = [] } = useQuery({
    queryKey: ["spine", "referrals", token],
    queryFn: async () => {
      const res = await api<{ data: ReferralRow[] }>("/api/v1/referrals");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["spine", "commission-rules", token],
    queryFn: async () => {
      const res = await api<{ data: CommissionRule[] }>("/api/v1/commission-rules");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const columns: SmallTableColumn<ReferralCode>[] = [
    {
      key: "id",
      label: "ID",
      primary: true,
      render: (it) => <span className="text-text-tertiary">#{it.id}</span>,
    },
    {
      key: "code",
      label: "Code",
      primary: true,
      render: (it) => (
        <span className="font-mono text-sm font-semibold tracking-wider text-text-primary">
          {it.code}
        </span>
      ),
    },
    {
      key: "user",
      label: "Owner",
      render: (it) =>
        it.user ? (
          <span className="text-text-secondary">
            {it.user.name} <span className="text-text-tertiary">({it.user.email})</span>
          </span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (it) => (
        <StatusBadge status={it.is_active ? "active" : "inactive"} />
      ),
    },
  ];

  function selectItem(id: number | string) {
    const n = Number(id);
    setSelectedId(n);
    window.location.hash = String(n);
    setSmallView(true);
  }

  function openGenerate() {
    setTerms(EMPTY_TERMS);
    setError(null);
    setOpen(true);
  }

  async function onGenerate() {
    if (!terms.accept_terms) {
      setError("Anda harus menyetujui syarat & ketentuan terlebih dahulu.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await api("/api/v1/referral-codes", {
        method: "POST",
        body: JSON.stringify({ accept_terms: true }),
      });
      if (!res.ok) {
        setError(res.error ?? "Gagal membuat kode");
        return;
      }
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["spine", "referral-codes"] });
      const savedId = (res.data as { id: number }).id;
      selectItem(savedId);
      setRefreshKey((k) => k + 1);
    } catch {
      setError("Gagal membuat kode");
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(item: ReferralCode) {
    const res = await api(`/api/v1/referral-codes/${item.id}/toggle`, {
      method: "PUT",
    });
    if (!res.ok) {
      setError(res.error ?? "Gagal mengubah status");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["spine", "referral-codes"] });
    setRefreshKey((k) => k + 1);
  }

  if (!canView) {
    return (
      <p className="text-sm text-text-tertiary">
        Anda tidak memiliki akses ke daftar referral.
      </p>
    );
  }

  const myCode = items.find((it) => it.user_id === me?.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Referrals
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Kode referral per user. Kode digenerate on-demand lewat form,
            setelah menyetujui syarat & ketentuan — user resmi menjadi
            referrer.
          </p>
        </div>
        {(canView || true) && (
          <Button onClick={openGenerate} isDisabled={Boolean(myCode)}>
            {myCode ? "Kode sudah aktif" : "Buat Kode Referral"}
          </Button>
        )}
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
          showDetail={smallView}
          refreshKey={refreshKey}
          perPage={perPage}
          getSearchText={(it) =>
            `${it.code} ${it.user?.name ?? ""} ${it.user?.email ?? ""}`
          }
          tabHideKeys={["ulid", "id", "user_id", "terms_version"]}
          tabCustomValue={{
            terms_accepted_at: (v) =>
              v ? new Date(v as string).toLocaleString("id-ID") : "—",
            code: (v) => <span className="font-mono">{String(v)}</span>,
          }}
          renderHeader={(it) => (
            <span className="flex items-center gap-2">
              <StatusBadge status={it.is_active ? "active" : "inactive"} />
              <span className="font-mono font-semibold tracking-wider text-text-primary">
                {it.code}
              </span>
              <span className="text-text-tertiary">#{it.id}</span>
            </span>
          )}
          toolbar={(item) => (
            <>
              <Button appearance="outline" onClick={() => onToggle(item)}>
                {item.is_active ? "Nonaktifkan" : "Aktifkan"}
              </Button>
              <Button
                appearance="outline"
                onClick={() => setSmallView((v) => !v)}
              >
                {smallView ? "◀" : "▶"}
              </Button>
            </>
          )}
          customTabBody={{
            referrals: (item) => (
              <div className="space-y-2">
                {referrals
                  .filter((r) => r.referral_code_id === item.id)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border border-card-border bg-card-background px-3 py-2 text-sm"
                    >
                      <span className="text-text-secondary">
                        @{r.referred?.name ?? r.referred_id} →{" "}
                        <span className="text-text-primary">
                          {r.referrer?.name ?? r.referrer_id}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        <span className="font-mono text-xs text-text-tertiary">
                          {r.registered_at
                            ? new Date(r.registered_at).toLocaleDateString("id-ID")
                            : ""}
                        </span>
                      </span>
                    </div>
                  ))}
                {referrals.filter((r) => r.referral_code_id === item.id)
                  .length === 0 && (
                  <p className="text-sm text-text-tertiary">
                    Belum ada referral untuk kode ini.
                  </p>
                )}
              </div>
            ),
          }}
        />
      )}

      <div className="rounded-xl border border-card-border bg-card-background p-4">
        <h2 className="text-sm font-semibold text-text-primary">
          Aturan Komisi
        </h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {rules.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-card-border px-3 py-2 text-sm"
            >
              <span className="text-text-secondary">{r.name}</span>
              <span className="font-mono text-text-primary">
                {r.type === "percentage" ? `${r.value}%` : `Rp ${Number(r.value).toLocaleString("id-ID")}`}
              </span>
            </div>
          ))}
          {rules.length === 0 && (
            <p className="text-sm text-text-tertiary">Belum ada aturan komisi.</p>
          )}
        </div>
      </div>

      {open && (
        <Dialog isOpen={open} onOpenChange={setOpen}>
          <DialogHeader>
            <DialogTitle>Buat Kode Referral</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-text-secondary">
              Kode referral membuat Anda resmi menjadi referrer. Anda dapat
              membagikan kode ini ke calon member.
            </p>
            <label className="flex items-start gap-2 text-sm text-text-secondary">
              <Checkbox
                isSelected={terms.accept_terms}
                onChange={(v) => setTerms({ accept_terms: v })}
              />
              <span>
                Saya menyetujui Syarat &amp; Ketentuan program referral
                (komisi, pencairan, dan larangan self-referral).
              </span>
            </label>
            {error && <p className="text-sm text-text-tertiary">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button
              appearance="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Batal
            </Button>
            <Button onClick={onGenerate} isDisabled={saving}>
              {saving ? "Membuat..." : "Generate Kode"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}