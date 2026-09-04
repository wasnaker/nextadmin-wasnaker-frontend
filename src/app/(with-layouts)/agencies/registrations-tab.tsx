"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { can, useAuth } from "@/services/spine/auth-context";
import { StatusBadge } from "@/components/spine/status-badge";
import { Button } from "@/components/tailgrids/core/button";

/**
 * SurveyorRegistrationsTab — tab "Surveyor Regs" di detail Disnaker.
 * Agency-admin memeriksa data surveyor lalu approve / review / reject.
 * Surveyor (register lintas dinas) melihat baris miliknya sendiri saja
 * (diffilter di backend) tanpa tombol keputusan.
 * Guard kepemilikan ada di backend (hanya admin agency pemilik / super-admin).
 */

interface SurveyorRegRow {
  id: number;
  status: "pending" | "approved" | "rejected" | "review";
  note?: string | null;
  surveyor?: {
    code: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    is_active?: boolean;
    admin?: { name: string; email: string } | null;
    province?: { name: string } | null;
    regency?: { name: string } | null;
  } | null;
  processed_by?: number | null;
  processed_at?: string | null;
  requested_by?: number | null;
}

const ACTION_LABEL: Record<string, string> = {
  approved: "Approve",
  review: "Minta Review",
  rejected: "Tolak",
};

export function SurveyorRegistrationsTab({ agencyId }: { agencyId: number }) {
  const { token, user: me } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<{ id: number; action: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Surveyor (register lintas dinas) → read-only; agency-admin → bisa decide.
  const canDecide = can(me, "agency:approve-surveyor-registration");

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["spine", "agency-registrations", agencyId, token],
    queryFn: async () => {
      const res = await api<{ data: SurveyorRegRow[] }>(
        `/api/v1/agencies/${agencyId}/surveyor-registrations`
      );
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token),
    // Denyut fix (sama dgn TabContent): ganti agency -> data sebelumnya tetap
    // tampil sebagai placeholder selama fetch (tanpa fase "Memuat...").
    placeholderData: (prev) => prev,
  });

  async function decide(row: SurveyorRegRow, action: string) {
    let note: string | undefined;
    if (action === "rejected") {
      note = window.prompt("Alasan penolakan (wajib):") ?? undefined;
      if (!note) return;
    }
    setBusy({ id: row.id, action });
    setErr(null);
    try {
      const res = await api(
        `/api/v1/agencies/${agencyId}/surveyor-registrations/${row.id}/decide`,
        {
          method: "POST",
          body: JSON.stringify({ action, note }),
        }
      );
      if (!res.ok) {
        setErr(res.error ?? "Gagal memproses");
        return;
      }
      await qc.invalidateQueries({
        queryKey: ["spine", "agency-registrations", agencyId],
      });
    } catch {
      setErr("Gagal memproses");
    } finally {
      setBusy(null);
    }
  }

  if (isPending) return <p className="text-sm text-text-tertiary">Memuat...</p>;

  return (
    <div className="space-y-3">
      {err && <p className="text-sm text-text-tertiary">{err}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-text-tertiary">
          Belum ada registrasi surveyor.
        </p>
      ) : (
        rows.map((r) => {
          const s = r.surveyor;
          const pending = r.status === "pending" || r.status === "review";
          return (
            <div
              key={r.id}
              className="rounded-lg border border-border-primary p-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    <span className="mr-2 font-mono text-xs text-text-tertiary">
                      {s?.code}
                    </span>
                    {s?.name}
                  </p>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {s?.email ?? "—"}
                    {s?.phone ? ` · ${s.phone}` : ""}
                    {s?.province
                      ? ` · ${s.province.name}${s.regency ? `, ${s.regency.name}` : ""}`
                      : ""}
                    {s?.admin?.name ? ` · Admin: ${s.admin.name}` : ""}
                  </p>
                  {r.note && (
                    <p className="mt-1 text-xs text-amber-700">Catatan: {r.note}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={r.status} />
                  {canDecide &&
                    pending &&
                    (["approved", "review", "rejected"] as const).map((a) => (
                      <Button
                        key={a}
                        appearance="outline"
                        size="sm"
                        isDisabled={busy !== null}
                        onPress={() => decide(r, a)}
                        className="h-7 px-2.5 text-xs"
                      >
                        {busy?.id === r.id && busy.action === a
                          ? "..."
                          : ACTION_LABEL[a]}
                      </Button>
                    ))}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
