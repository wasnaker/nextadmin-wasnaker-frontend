"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/core/auth/auth-context";
import { TableBody, TableCell, TableHead, TableHeader, TableRoot, TableRow } from "@/components/tailgrids/core/table";
import { useT } from "@/core/i18n";

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
  const t = useT();

  const { data: staffs = [], isPending } = useQuery({
    queryKey: ["spine", "platform-staffs", token],
    queryFn: async () => {
      const res = await api<{ data: PlatformStaff[] }>("/api/v1/platform/staffs");
      if (!res.ok) throw new Error(res.error ?? t("Failed to load staff"));
      return res.data?.data ?? [];
    },
    enabled: Boolean(token),
    placeholderData: (prev) => prev,
  });

  if (isPending) return <p className="text-sm text-text-tertiary">{t("Loading...")}</p>;

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card-background">
      <div className="border-b border-border-primary px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">{t("Staff List")}</h2>
      </div>
      <TableRoot className="w-full text-sm">
        <TableHeader>
          <TableRow className="border-b border-border-primary text-left text-xs text-text-tertiary">
            <TableHead className="px-5 py-2.5 font-medium">{t("Name")}</TableHead>
            <TableHead className="px-5 py-2.5 font-medium">Jabatan</TableHead>
            <TableHead className="px-5 py-2.5 font-medium">Departemen</TableHead>
            <TableHead className="px-5 py-2.5 font-medium">Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffs.map((s) => (
            <TableRow key={s.id} className="border-b border-border-primary/60 last:border-0">
              <TableCell className="px-5 py-2.5 text-text-primary">{s.realname}</TableCell>
              <TableCell className="px-5 py-2.5 text-text-secondary">{s.jabatan ?? "—"}</TableCell>
              <TableCell className="px-5 py-2.5 text-text-secondary">{s.departemen ?? "—"}</TableCell>
              <TableCell className="px-5 py-2.5 text-text-secondary">{s.user.email}</TableCell>
            </TableRow>
          ))}
          {staffs.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="px-5 py-6 text-sm text-text-tertiary">
                Belum ada staf.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </TableRoot>
    </div>
  );
}
