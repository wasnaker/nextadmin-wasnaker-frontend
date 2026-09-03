"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { useAuth, can } from "@/services/spine/auth-context";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardContent } from "@/components/tailgrids/core/card";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { FieldLabel } from "@/components/tailgrids/core/field";
import { Input } from "@/components/tailgrids/core/input";
import { TextArea } from "@/components/tailgrids/core/text-area";
import { cn } from "@/utils/cn";
import { useRouter } from "next/navigation";

/**
 * Settings — halaman generik schema-driven (padanan nextjs-spine settings page):
 *   GET  /api/v1/settings/schema -> tabs[] {slug,label,icon,fields[]}
 *   POST /api/v1/settings/bulk   -> nilai aktual per key
 *   PUT  /api/v1/settings/{key}  -> simpan
 * Tab & field datang dari manifest modul aktif — TIDAK ada hardcode di sini.
 */

interface SettingsField {
  key: string;
  label: string;
  type: string;
  options?: { value: string; label: string }[];
  default?: string;
  action?: { method: string; path: string; from_key?: string; body_key?: string };
}

interface SettingsTab {
  slug: string;
  label: string;
  icon?: string;
  position?: number;
  fields: SettingsField[];
}

/** Tombol field tipe "action" — nilai dari_key dibaca langsung dari form. */
function ActionField({
  field,
  formRef,
  onDone,
}: {
  field: SettingsField;
  formRef: React.RefObject<HTMLFormElement | null>;
  onDone: (msg: string, ok: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const action = field.action;
  if (!action) return null;

  async function run() {
    if (!action) return;
    setBusy(true);
    try {
      const body: Record<string, string> = {};
      if (action.from_key && action.body_key && formRef.current) {
        const fd = new FormData(formRef.current);
        body[action.body_key] = String(fd.get(action.from_key) ?? "");
      }
      const res = await api(action.path, {
        method: action.method,
        body: JSON.stringify(body),
      });
      onDone(res.ok ? "Berhasil ✓" : res.error ?? "Gagal", res.ok);
    } catch {
      onDone("Gagal", false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button appearance="outline" onClick={run} isDisabled={busy}>
      {busy ? "Mengirim..." : field.label}
    </Button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { token, ready, user } = useAuth();
  const canView = can(user, "settings:view");
  const [active, setActive] = useState<string | null>(null);
  const [busySave, setBusySave] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null);
  const [formVersion, setFormVersion] = useState(0); // remount form per tab / data baru
  const formRef = useRef<HTMLFormElement>(null);
  const qc = useQueryClient();

  const schemaQ = useQuery({
    queryKey: ["spine", "settings-schema", token],
    queryFn: async () => {
      const res = await api<{ tabs: SettingsTab[] }>("/api/v1/settings/schema");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat schema");
      return res.data?.tabs ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const tabs = [...(schemaQ.data ?? [])].sort(
    (a, b) => (a.position ?? 999) - (b.position ?? 999)
  );
  const tab = tabs.find((t) => t.slug === active) ?? tabs[0] ?? null;

  // Nilai aktual per key tab aktif (bulk GETTER — API tidak punya bulk setter).
  const bulkQ = useQuery({
    queryKey: ["spine", "settings-bulk", token, tab?.slug],
    queryFn: async () => {
      const keys = tab?.fields.map((f) => f.key) ?? [];
      const res = await api<{ data: Record<string, string | null> }>(
        "/api/v1/settings/bulk",
        { method: "POST", body: JSON.stringify({ keys }) }
      );
      return res.data?.data ?? {};
    },
    enabled: Boolean(token && tab && canView),
  });

  // Input UNCONTROLLED: defaultValue + remount (key) saat tab/ganti data —
  // tanpa state sync, tanpa setState-in-effect.
  const valueOf = (f: SettingsField): string => {
    const v = bulkQ.data?.[f.key];
    return v !== undefined && v !== null ? v : f.default ?? "";
  };

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tab) return;
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    setBusySave(true);
    setNotice(null);
    try {
      for (const f of tab.fields) {
        if (f.type === "action") continue;
        let val: string | null;
        if (f.type === "checkbox") {
          // Checkbox RAC tidak ikut FormData saat unchecked — baca dari DOM.
          const el = formRef.current?.elements.namedItem(f.key) as
            | HTMLInputElement
            | null;
          val = el ? (el.checked ? "1" : "0") : null;
        } else {
          val = String(fd.get(f.key) ?? "");
        }
        if (val === null) continue;
        const res = await api(`/api/v1/settings/${f.key}`, {
          method: "PUT",
          body: JSON.stringify({ value: val }),
        });
        if (!res.ok) {
          setNotice({ msg: res.error ?? `Gagal menyimpan ${f.key}`, ok: false });
          return;
        }
      }
      setNotice({ msg: "Tersimpan ✓", ok: true });
      await qc.invalidateQueries({ queryKey: ["spine", "settings-bulk"] });
    } catch {
      setNotice({ msg: "Gagal menyimpan", ok: false });
    } finally {
      setBusySave(false);
    }
  }

  // Belum login / validasi mount belum selesai -> ke halaman login.
  useEffect(() => {
    if (ready && !token) router.replace("/login");
  }, [ready, token, router]);

  if (!ready || !token) return null;

  if (!canView) {
    return (
      <p className="text-sm text-text-tertiary">
        Anda tidak memiliki akses ke pengaturan.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Tab & field dari manifest modul aktif (schema API).
        </p>
      </div>

      {notice && (
        <p className={cn("text-sm", notice.ok ? "text-text-secondary" : "text-text-tertiary")}>
          {notice.msg}
        </p>
      )}

      {tabs.length === 0 && !schemaQ.isPending && (
        <Card>
          <p className="text-sm text-text-tertiary">Tidak ada tab settings dari modul aktif.</p>
        </Card>
      )}

      {tab && (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Nav tab (kiri) */}
          <nav className="flex w-full shrink-0 gap-2 overflow-x-auto lg:w-64 lg:flex-col">
            {tabs.map((t) => {
              const isActive = t.slug === tab.slug;
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => {
                    setActive(t.slug);
                    setNotice(null);
                    setFormVersion((v) => v + 1);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm whitespace-nowrap transition-colors",
                    isActive
                      ? "border-primary-300 bg-primary-50 text-text-primary"
                      : "border-card-border bg-card-background text-text-secondary hover:text-text-primary"
                  )}
                >
                  {t.icon && <span className="text-base">{t.icon}</span>}
                  {t.label}
                </button>
              );
            })}
          </nav>

          {/* Form (kanan) */}
          <div className="min-w-0 flex-1">
            <Card>
              <form
                ref={formRef}
                key={`${tab.slug}-${formVersion}-${bulkQ.data ? "v" : "l"}`}
                onSubmit={onSave}
              >
                <CardContent className="space-y-4">
                  <h2 className="text-lg font-semibold text-text-primary">{tab.label}</h2>
                  {tab.fields.map((f) => {
                    if (f.type === "action") {
                      return (
                        <div key={f.key}>
                          <ActionField field={f} formRef={formRef} onDone={(m, ok) => setNotice({ msg: m, ok })} />
                        </div>
                      );
                    }
                    if (f.type === "checkbox") {
                      return (
                        <div key={f.key}>
                          <Checkbox name={f.key} value="1" defaultSelected={valueOf(f) === "1"}>
                            {f.label}
                          </Checkbox>
                        </div>
                      );
                    }
                    return (
                      <div key={f.key}>
                        <FieldLabel htmlFor={`f-${f.key}`}>{f.label}</FieldLabel>
                        {f.type === "textarea" ? (
                          <TextArea
                            id={`f-${f.key}`}
                            name={f.key}
                            rows={4}
                            defaultValue={valueOf(f)}
                            className="mt-1.5 w-full"
                          />
                        ) : f.type === "select" ? (
                          // ponytail: native select (API Select RAC berlapis) —
                          // ganti ke primitives Select kalau perlu a11y penuh.
                          <select
                            id={`f-${f.key}`}
                            name={f.key}
                            defaultValue={valueOf(f)}
                            className="mt-1.5 w-full rounded-lg border border-card-border bg-input-background px-4 py-2.5 text-title-50 outline-none focus:border-input-primary-focus-border"
                          >
                            {(f.options ?? []).map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            id={`f-${f.key}`}
                            name={f.key}
                            type={f.type === "number" ? "number" : f.type === "password" ? "password" : "text"}
                            defaultValue={valueOf(f)}
                            className="mt-1.5 w-full"
                          />
                        )}
                      </div>
                    );
                  })}

                  <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" isDisabled={busySave}>
                      {busySave ? "Menyimpan..." : "Simpan"}
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
