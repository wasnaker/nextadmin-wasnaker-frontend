"use client";

import Link from "next/link";
import { buttonStyles } from "@/components/tailgrids/core/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/tailgrids/core/card";
import { useAuth } from "@/services/spine/auth-context";
import { useModuleExtensions } from "@/services/spine/module-extensions";
import { cn } from "@/utils/cn";

/**
 * Halaman depan — Spine-aware:
 *  - belum login : CTA ke /login
 *  - sudah login : sambutan + kartu modul (menu dari extensions) + Settings
 */
export default function Home() {
  const { token, user, ready } = useAuth();
  const { data: ext } = useModuleExtensions();
  const modules = [...(ext?.menu ?? [])].sort(
    (a, b) => (a.position ?? 999) - (b.position ?? 999)
  );

  if (!ready) return null; // cegah flash (validasi token mount)

  return (
    <div className="space-y-6 px-2 lg:px-6">
      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">
          {token
            ? `Selamat datang${user?.name ? `, ${user.name}` : ""}.`
            : "Masuk untuk mengakses modul."}
        </p>
      </div>

      {!token ? (
        <Card className="mx-auto mt-12 max-w-md text-center">
          <CardHeader className="items-center">
            <CardTitle>Masuk ke Wasnaker</CardTitle>
            <CardDescription>
              Menu modul aktif (dari Spine) baru tampil setelah login.
            </CardDescription>
          </CardHeader>
          <div className="pb-6">
            <Link href="/login" className={buttonStyles({ size: "lg", className: "w-full" })}>
              Masuk
            </Link>
          </div>
        </Card>
      ) : (
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
      )}
    </div>
  );
}
