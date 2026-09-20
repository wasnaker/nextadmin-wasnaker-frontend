import { api, getToken } from "@wasnaker/web-core";

/** Kunci localStorage asal token (dipakai banner impersonasi host). */
export const IMPERSONATE_ORIGIN_KEY = "spine_impersonate_origin";

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