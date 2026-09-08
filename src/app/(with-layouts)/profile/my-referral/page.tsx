"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { useAuth } from "@/services/spine/auth-context";
import { Card } from "@/components/tailgrids/core/card";
import { StatusBadge } from "@/components/spine/status-badge";

/**
 * My Referral — tab Profile (self-service).
 * GET /api/v1/referrals/me — data milik user login (tanpa permission gate).
 */

interface MyReferralData {
  code: {
    code: string;
    is_active: boolean;
    terms_accepted_at?: string | null;
    created_at?: string | null;
  } | null;
  referrals: {
    id: number;
    referred?: { id: number; name: string; email: string } | null;
    code?: { id: number; code: string } | null;
    status: string;
    registered_at?: string | null;
  }[];
  total: number;
}

function useMyReferral() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["spine", "my-referral", token],
    queryFn: async () => {
      const res = await api<MyReferralData>("/api/v1/referrals/me");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data;
    },
    enabled: Boolean(token),
  });
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2.5">
      <dt className="w-36 shrink-0 text-xs uppercase tracking-wider text-text-tertiary">{label}</dt>
      <dd className="text-sm text-text-primary">{children}</dd>
    </div>
  );
}

export default function MyReferralPage() {
  const { data, isPending, error } = useMyReferral();

  if (isPending) return <p className="text-sm text-text-tertiary">Memuat...</p>;
  if (error) return <p className="text-sm text-text-tertiary">{String(error)}</p>;

  const code = data?.code ?? null;
  const referrals = data?.referrals ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold text-text-primary">My Referral</h2>
        {code && (
          <StatusBadge status={code.is_active ? "active" : "inactive"} />
        )}
      </div>

      {!code ? (
        <p className="text-sm text-text-tertiary">
          Anda belum memiliki kode referral. Buat kode di menu{" "}
          <span className="font-medium text-text-primary">Referrals</span> (setujui T&amp;C) untuk mulai mengajak.
        </p>
      ) : (
        <Card className="p-5">
          <dl className="divide-y divide-border-primary">
            <InfoRow label="Kode">
              <span className="font-mono">{code.code}</span>
            </InfoRow>
            <InfoRow label="Status">
              <StatusBadge status={code.is_active ? "active" : "inactive"} />
            </InfoRow>
            {code.created_at && (
              <InfoRow label="Dibuat">
                {new Date(code.created_at).toLocaleString("id-ID")}
              </InfoRow>
            )}
          </dl>
        </Card>
      )}

      <h3 className="text-lg font-semibold text-text-primary">
        Yang Anda ajak ({data?.total ?? referrals.length})
      </h3>
      {referrals.length === 0 ? (
        <p className="text-sm text-text-tertiary">
          Belum ada orang yang mendaftar lewat kode Anda.
        </p>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-primary text-xs uppercase tracking-wider text-text-tertiary">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Terdaftar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              {referrals.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-text-primary">{r.referred?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-text-tertiary">{r.referred?.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-text-tertiary">
                    {r.registered_at
                      ? new Date(r.registered_at).toLocaleString("id-ID")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}