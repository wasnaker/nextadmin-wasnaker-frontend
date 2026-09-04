"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { useAuth } from "@/services/spine/auth-context";
import { StatusBadge } from "@/components/spine/status-badge";
import { Button } from "@/components/tailgrids/core/button";

/**
 * SurveyorRegisterView — halaman Agency utk role surveyor (lintas dinas).
 * Daftar Disnaker (type=agency) + tombol "Register Here" + status registrasi
 * HO milik user. Dipilih otomatis oleh halaman /agencies saat caller
 * surveyor (punya agency:surveyor-register, tanpa agency:view).
 */

interface DisnakerRow {
  id: number;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  province?: { id: number; name: string } | null;
  registration_status?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu review",
  review: "Perlu review ulang",
  approved: "Terdaftar",
  rejected: "Ditolak",
};

export default function SurveyorRegisterView() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: items = [], isPending } = useQuery({
    queryKey: ["spine", "agencies", token],
    queryFn: async () => {
      const res = await api<{ data: DisnakerRow[] }>("/api/v1/agencies");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token),
  });

  async function onRegister(agency: DisnakerRow) {
    setBusyId(agency.id);
    setNotice(null);
    try {
      const res = await api(`/api/v1/agencies/${agency.id}/surveyor-registration`, {
        method: "POST",
      });
      if (!res.ok) {
        setNotice(
          (res.error ?? "Gagal mendaftar") +
            (agency.code ? ` (${agency.code})` : "")
        );
        return;
      }
      setNotice(`Registrasi ke ${agency.name} terkirim — menunggu review Disnaker.`);
      await qc.invalidateQueries({ queryKey: ["spine", "agencies"] });
    } catch {
      setNotice("Gagal mendaftar");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Daftar Disnaker
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Surveyor dapat bekerja lintas dinas — daftarkan perusahaan Anda ke
          Disnaker untuk mendapatkan kewenangan resmi di wilayahnya.
        </p>
      </div>

      {notice && <p className="text-sm text-text-secondary">{notice}</p>}

      {isPending ? (
        <p className="text-sm text-text-tertiary">Memuat...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-tertiary">Belum ada Disnaker.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-card-border bg-card-background">
          {items.map((a, i) => (
            <div
              key={a.id}
              className={
                "flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 " +
                (i > 0 ? "border-t border-border-primary" : "")
              }
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  <span className="mr-2 font-mono text-xs text-text-tertiary">
                    {a.code}
                  </span>
                  {a.name}
                </p>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {a.province?.name ?? "—"}
                  {a.phone ? ` · ${a.phone}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {a.registration_status ? (
                  <>
                    <StatusBadge status={a.registration_status} />
                    <span className="text-xs text-text-tertiary">
                      {STATUS_LABEL[a.registration_status] ?? a.registration_status}
                    </span>
                  </>
                ) : (
                  <Button
                    appearance="outline"
                    size="sm"
                    isDisabled={busyId !== null}
                    onPress={() => onRegister(a)}
                    className="h-8 px-3 text-xs"
                  >
                    {busyId === a.id ? "Mendaftar..." : "Register Here"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
