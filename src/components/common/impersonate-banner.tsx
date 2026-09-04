"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/tailgrids/core/button";
import { useAuth } from "@/services/spine/auth-context";
import { api, getToken } from "@/services/spine/api";

/** Key localStorage token asli (admin) saat sedang impersonate. */
export const IMPERSONATE_ORIGIN_KEY = "spine_impersonate_origin";

export function isImpersonating(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(IMPERSONATE_ORIGIN_KEY) !== null;
}

interface MyEntity {
  type: "customer" | "surveyor" | "agency" | "association" | null;
  entity: {
    id: number;
    code?: string | null;
    name: string;
    type?: string;
    parent_id?: number | null;
  } | null;
}

const WORLD_LABEL: Record<string, string> = {
  customer: "Customer",
  surveyor: "Surveyor",
  agency: "Agency",
  association: "Association",
};

function entityLabel(e: MyEntity | undefined): string {
  if (!e?.type || !e.entity) return "";
  const t = e.entity.type && e.entity.type !== e.type ? ` (${e.entity.type})` : "";
  return `${WORLD_LABEL[e.type]} · ${e.entity.code ? `${e.entity.code} ` : ""}${e.entity.name}${t}`;
}

/**
 * Banner "logged as" — tampil di seluruh halaman (layout utama) selama token
 * asli disimpan. Tombol Kembali: revoke token impersonate (logout), lalu
 * restore token admin.
 */
export function ImpersonateBanner() {
  const { token, user, logout, signIn } = useAuth();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setActive(isImpersonating());
  }, [user]);

  // Entity tempat user (hasil impersonasi) bernaung — utk banner.
  const { data: myEntity } = useQuery({
    queryKey: ["spine", "user-entity", token],
    queryFn: async () => {
      const res = await api<MyEntity>("/api/v1/user/entity");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data;
    },
    enabled: Boolean(token) && active,
  });

  if (!active || !user) return null;

  const roles = user.access?.roles ?? [];
  const entityTxt = entityLabel(myEntity);

  async function onExit() {
    setBusy(true);
    try {
      // Revoke token impersonate di server (logout dgn token user).
      await logout();
      const origin = localStorage.getItem(IMPERSONATE_ORIGIN_KEY);
      localStorage.removeItem(IMPERSONATE_ORIGIN_KEY);
      if (origin) await signIn(origin);
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>
          Logged in as <strong>{user.name}</strong> ({user.email})
        </span>
        {roles.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {roles.map((r) => (
              <span
                key={r}
                className="rounded bg-amber-100 px-1.5 py-0.5 font-medium"
              >
                {r}
              </span>
            ))}
          </span>
        )}
        {entityTxt && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium">
            {entityTxt}
          </span>
        )}
        <span className="opacity-70">— mode impersonasi</span>
      </span>
      <Button
        appearance="outline"
        size="sm"
        isDisabled={busy}
        onPress={onExit}
        className="h-7 px-3 text-xs"
      >
        {busy ? "Kembali..." : "Kembali ke admin"}
      </Button>
    </div>
  );
}

/**
 * Mulai impersonasi: minta token atas nama user target, simpan token asli,
 * lalu panggil signIn(token) + arahkan ke dashboard.
 */
export async function startImpersonate(
  userId: number,
  signIn: (token: string) => Promise<void>,
  push: (href: string) => void
): Promise<{ ok: boolean; error?: string }> {
  const res = await api<{ token: string }>(`/api/v1/impersonate/${userId}`, {
    method: "POST",
  });
  if (!res.ok) return { ok: false, error: res.error ?? "Gagal impersonate" };
  const origin = getToken();
  if (origin) localStorage.setItem(IMPERSONATE_ORIGIN_KEY, origin);
  await signIn(res.data.token);
  push("/");
  return { ok: true };
}
