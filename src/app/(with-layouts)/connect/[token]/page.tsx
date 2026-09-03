"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { can, useAuth } from "@/services/spine/auth-context";
import { StatusBadge } from "@/components/spine/status-badge";
import { Button } from "@/components/tailgrids/core/button";
import { Skeleton } from "@/components/tailgrids/core/skeleton";

interface Party {
  id: number;
  code: string;
  name: string;
  type?: string;
}

interface LinkInfo {
  id: number;
  token: string;
  status: string;
  customer?: Party | null;
  surveyor?: Party | null;
  created_by?: string | null;
  created_at?: string | null;
}

function partyLabel(p: Party | null | undefined): string {
  if (!p) return "—";
  return `${p.code} ${p.name}`;
}

/**
 * /connect/[token] — halaman approve link koneksi.
 * Dibuka oleh pihak yang menerima link (di luar aplikasi). Harus login
 * sebagai admin entity lawan dunia (customer vs surveyor).
 */
export default function ConnectApprovePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const router = useRouter();
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canApprove = can(me, "connection:approve");

  const { data: info, isPending, isError } = useQuery({
    queryKey: ["spine", "connection-link", token],
    queryFn: async () => {
      const res = await api<LinkInfo>(`/api/v1/connections/${token}`);
      if (!res.ok) throw new Error(res.error ?? "Link tidak valid");
      return res.data as LinkInfo;
    },
    enabled: Boolean(token),
    retry: false,
  });

  async function onApprove() {
    setBusy(true);
    setError(null);
    try {
      const res = await api(`/api/v1/connections/${token}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        setError(res.error ?? "Gagal approve");
        return;
      }
      setResult("Koneksi berhasil dibuat. Kedua pihak kini terhubung.");
      await qc.invalidateQueries({ queryKey: ["spine", "connections"] });
    } catch {
      setError("Gagal approve");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Link Koneksi
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Seseorang mengirim link ini untuk menjalin hubungan kerja denganmu.
        </p>
      </div>

      {isPending && (
        <div className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-border-primary p-4 text-sm text-text-tertiary">
          Link tidak ditemukan atau sudah tidak berlaku.
        </div>
      )}

      {info && !result && (
        <div className="space-y-4 rounded-lg border border-border-primary p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">
              Status
            </span>
            <StatusBadge status={info.status} />
          </div>
          <div className="text-sm text-text-secondary">
            Dibuat oleh {info.created_by ?? "—"} pada{" "}
            {info.created_at
              ? new Date(info.created_at).toLocaleString("id-ID")
              : "—"}
          </div>

          {!canApprove ? (
            <p className="text-sm text-text-tertiary">
              Akunmu tidak memiliki permission connection:approve.
            </p>
          ) : (
            <div className="flex gap-3">
              <Button appearance="outline" onClick={() => router.push("/connections")}>
                Kembali
              </Button>
              <Button onClick={onApprove} isDisabled={busy}>
                {busy ? "Memproses..." : "Approve Koneksi"}
              </Button>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-lg border border-border-primary p-5">
          <p className="text-sm text-text-primary">{result}</p>
          <Button appearance="outline" onClick={() => router.push("/connections")}>
            Lihat Connections
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-text-tertiary">{error}</p>}
    </div>
  );
}
