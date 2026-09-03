/**
 * Spine API — satu helper fetch tipis (Bearer token, JSON, error).
 * API_URL default = same-origin (wasnaker.lan/api/v1 -> PHP-FPM core);
 * override via NEXT_PUBLIC_API_URL untuk dev cross-origin (mis. spine.lan).
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("spine_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("spine_token", token);
  else localStorage.removeItem("spine_token");
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    // Hanya JSON body (string) yang butuh Content-Type; FormData (multipart)
    // dibiarkan — browser mengisi boundary sendiri.
    ...(typeof options.body === "string"
      ? { "Content-Type": "application/json" }
      : {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    return { ok: false, status: 0, data: null as T, error: "Jaringan bermasalah" };
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // body kosong
  }

  if (!res.ok) {
    const err = (data as { message?: string })?.message ?? `HTTP ${res.status}`;
    return { ok: false, status: res.status, data: data as T, error: err };
  }

  return { ok: true, status: res.status, data: data as T };
}
