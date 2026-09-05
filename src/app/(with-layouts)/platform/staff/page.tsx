"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { useAuth } from "@/services/spine/auth-context";

interface PlatformStaff {
  id: number;
  realname: string;
  jabatan: string | null;
  departemen: string | null;
  nip: string | null;
  is_active: boolean;
  user: { id: number; name: string; email: string };
}

export default function PlatformStaffPage() {
  const { token } = useAuth();

  const { data: staffs = [], isPending } = useQuery({
    queryKey: ["spine", "platform-staffs", token],
    queryFn: async () => {
      const res = await api<{ data: PlatformStaff[] }>("/api/v1/platform/staffs");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat staf");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token),
    placeholderData: (prev) => prev,
  });

  if (isPending) return <p className="text-sm text-text-tertiary">Memuat...</p>;

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card-background">
      <div className="border-b border-border-primary px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">Daftar Staf</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-primary text-left text-xs text-text-tertiary">
            <th className="px-5 py-2.5 font-medium">Nama</th>
            <th className="px-5 py-2.5 font-medium">Jabatan</th>
            <th className="px-5 py-2.5 font-medium">Departemen</th>
            <th className="px-5 py-2.5 font-medium">Email</th>
          </tr>
        </thead>
        <tbody>
          {staffs.map((s) => (
            <tr key={s.id} className="border-b border-border-primary/60 last:border-0">
              <td className="px-5 py-2.5 text-text-primary">{s.realname}</td>
              <td className="px-5 py-2.5 text-text-secondary">{s.jabatan ?? "—"}</td>
              <td className="px-5 py-2.5 text-text-secondary">{s.departemen ?? "—"}</td>
              <td className="px-5 py-2.5 text-text-secondary">{s.user.email}</td>
            </tr>
          ))}
          {staffs.length === 0 && (
            <tr>
              <td colSpan={4} className="px-5 py-6 text-sm text-text-tertiary">
                Belum ada staf.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
