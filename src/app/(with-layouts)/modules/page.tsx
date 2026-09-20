"use client";

import { useEffect, useState } from "react";
import { api } from "@wasnaker/web-core";
import { StatusBadge, Button } from "@wasnaker/next-ui";
import { useAuth, can } from "@/core/auth/auth-context";
import { useT } from "@/core/i18n";

interface SpineModule {
  name: string;
  alias: string;
  enabled: boolean;
  installed: boolean;
  description?: string;
}

export default function ModulesPage() {
  const { user } = useAuth();
  const t = useT();
  const [modules, setModules] = useState<SpineModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const hasManagePermission = can(user, "modules:manage");

  async function load() {
    setLoading(true);
    setError(null);
    const res = await api<{ data: SpineModule[] }>("/api/v1/modules");
    if (!res.ok) {
      setError(res.error ?? t("Gagal memuat modul"));
      setModules([]);
      setLoading(false);
      return;
    }
    const obj = res.data?.data ?? {};
    const arr: SpineModule[] = Object.entries(obj).map(([alias, m]) => ({
      ...m,
      alias,
    }));
    arr.sort((a, b) => a.name.localeCompare(b.name));
    setModules(arr);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(mod: SpineModule, enabled: boolean) {
    setBusyId(mod.alias);
    setError(null);
    const res = await api(
      `/api/v1/modules/${mod.alias}/${enabled ? "enable" : "disable"}`,
      { method: "POST" }
    );
    if (!res.ok) {
      setError(res.error ?? t("Gagal mengubah status"));
      setBusyId(null);
      return;
    }
    setBusyId(null);
    load();
  }

  async function uninstall(mod: SpineModule) {
    if (!confirm(t("Hapus modul {name}?", { name: mod.name }))) return;
    setBusyId(mod.alias);
    setError(null);
    const res = await api(
      `/api/v1/modules/${mod.alias}/uninstall`,
      { method: "POST" }
    );
    if (!res.ok) {
      setError(res.error ?? t("Gagal menghapus modul"));
      setBusyId(null);
      return;
    }
    setBusyId(null);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-text-primary">
        {t("Modul")}
      </h1>
      <p className="text-sm text-text-tertiary">
        {t("Kelola modul yang terpasang di sistem.")}
      </p>

      {loading && <p className="text-sm text-text-secondary">Memuat...</p>}
      {!loading && error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && !error && modules.length === 0 && (
        <p className="text-sm text-text-secondary">
          {t("Belum ada modul terpasang.")}
        </p>
      )}
      {!loading &&
        !error &&
        modules.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border-subtle">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-subtle text-left">
                  <th className="px-4 py-2.5 font-medium text-text-secondary">
                    {t("Nama")}
                  </th>
                  <th className="px-4 py-2.5 font-medium text-text-secondary">
                    {t("Alias")}
                  </th>
                  <th className="px-4 py-2.5 font-medium text-text-secondary">
                    {t("Status")}
                  </th>
                  <th className="px-4 py-2.5 font-medium text-text-secondary">
                    {t("Terpasang")}
                  </th>
                  <th className="px-4 py-2.5 font-medium text-text-secondary">
                    {t("Aksi")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => (
                  <tr
                    key={m.alias}
                    className="border-b border-border-subtle last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {m.name}
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                      {m.alias}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge
                          status={m.enabled ? "active" : "inactive"}
                        />
                        <span className="text-xs text-text-tertiary">
                          {m.enabled ? t("Aktif") : t("Nonaktif")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-secondary">
                        {m.installed ? t("Ya") : t("Tidak")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {m.installed && (
                          <>
                            <Button
                              appearance="ghost"
                              size="xs"
                              isDisabled={
                                !hasManagePermission || busyId === m.alias
                              }
                              onClick={() => toggle(m, !m.enabled)}
                            >
                              {m.enabled ? t("Nonaktifkan") : t("Aktifkan")}
                            </Button>
                            <Button
                              appearance="ghost"
                              size="xs"
                              isDisabled={
                                !hasManagePermission || busyId === m.alias
                              }
                              onClick={() => uninstall(m)}
                            >
                              {t("Hapus")}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}