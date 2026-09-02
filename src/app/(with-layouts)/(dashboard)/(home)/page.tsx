"use client";

import Link from "next/link";
import { useAuth } from "@/services/spine/auth-context";
import { useModuleExtensions } from "@/services/spine/module-extensions";
import { cn } from "@/utils/cn";

/**
 * Halaman depan (butuh login — shell (with-layouts) sudah redirect ke /login).
 * Sambutan + kartu modul (menu dari extensions) + Settings.
 */
export default function Home() {
  const { user } = useAuth();
  const { data: ext } = useModuleExtensions();
  const modules = [...(ext?.menu ?? [])].sort(
    (a, b) => (a.position ?? 999) - (b.position ?? 999)
  );

  return (
    <div className="space-y-6 px-2 lg:px-6">
      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">
          {user?.name ? `Selamat datang, ${user.name}.` : "Selamat datang."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.slug}
            href={m.href}
            className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5 transition-colors hover:border-primary-300"
          >
            <span className="flex items-center gap-3">
              {m.icon && <span className="text-2xl">{m.icon}</span>}
              <span className="text-sm font-semibold text-text-primary">{m.label}</span>
            </span>
          </Link>
        ))}
        <Link
          href="/settings"
          className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5 transition-colors hover:border-primary-300"
        >
          <span className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <span className="text-sm font-semibold text-text-primary">Settings</span>
          </span>
        </Link>
        {modules.length === 0 && (
          <p className={cn("text-sm text-text-tertiary")}>
            Belum ada modul aktif — daftar modul muncul di sini.
          </p>
        )}
      </div>
    </div>
  );
}
