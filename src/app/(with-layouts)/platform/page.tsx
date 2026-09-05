"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/services/spine/api";
import { useAuth } from "@/services/spine/auth-context";
import { cn } from "@/utils/cn";

interface PlatformStaff {
  id: number;
  realname: string;
  jabatan: string | null;
  departemen: string | null;
  nip: string | null;
  is_active: boolean;
  user: { id: number; name: string; email: string };
}

const TABS = [
  { slug: "staff", label: "Staff" },
  { slug: "cuti", label: "Cuti" },
  { slug: "gaji", label: "Gaji" },
] as const;

/**
 * Halaman Platform (menu 🏢) — tab internal staff management.
 * Tab Staff: daftar staf platform (realname/jabatan/departemen).
 * Cuti & Gaji: menyusul.
 */
export default function PlatformPage() {
  const { token } = useAuth();
  const [active, setActive] = useState<(typeof TABS)[number]["slug"]>("staff");

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

  return (
    <div className='space-y-5'>
      <div>
        <h1 className='text-lg font-semibold text-text-primary'>Platform</h1>
        <p className='text-sm text-text-secondary'>
          Manajemen internal — staf, cuti, gaji.
        </p>
      </div>

      <nav className='flex flex-wrap gap-1 border-b border-border-primary'>
        {TABS.map((t) => (
          <button
            key={t.slug}
            type='button'
            onClick={() => setActive(t.slug)}
            className={cn(
              "rounded-t-md px-4 py-2 text-sm transition-colors",
              active === t.slug
                ? "border-b-2 border-badge-primary-background font-medium text-badge-primary-text"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {active === "staff" && (
        <div className='overflow-hidden rounded-xl border border-card-border bg-card-background'>
          <div className='border-b border-border-primary px-5 py-4'>
            <h2 className='text-sm font-semibold text-text-primary'>
              Daftar Staf
            </h2>
          </div>
          {isPending ? (
            <p className='px-5 py-6 text-sm text-text-tertiary'>Memuat...</p>
          ) : (
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-border-primary text-left text-xs text-text-tertiary'>
                  <th className='px-5 py-2.5 font-medium'>Nama</th>
                  <th className='px-5 py-2.5 font-medium'>Jabatan</th>
                  <th className='px-5 py-2.5 font-medium'>Departemen</th>
                  <th className='px-5 py-2.5 font-medium'>Email</th>
                </tr>
              </thead>
              <tbody>
                {staffs.map((s) => (
                  <tr key={s.id} className='border-b border-border-primary/60 last:border-0'>
                    <td className='px-5 py-2.5 text-text-primary'>{s.realname}</td>
                    <td className='px-5 py-2.5 text-text-secondary'>{s.jabatan ?? "—"}</td>
                    <td className='px-5 py-2.5 text-text-secondary'>{s.departemen ?? "—"}</td>
                    <td className='px-5 py-2.5 text-text-secondary'>{s.user.email}</td>
                  </tr>
                ))}
                {staffs.length === 0 && (
                  <tr>
                    <td colSpan={4} className='px-5 py-6 text-sm text-text-tertiary'>
                      Belum ada staf.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {active === "cuti" && (
        <p className='text-sm text-text-tertiary'>Tab Cuti — menyusul.</p>
      )}
      {active === "gaji" && (
        <p className='text-sm text-text-tertiary'>Tab Gaji — menyusul.</p>
      )}
    </div>
  );
}
