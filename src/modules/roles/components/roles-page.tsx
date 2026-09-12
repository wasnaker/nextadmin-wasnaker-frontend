"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { can, useAuth } from "@/core/auth/auth-context";
import {
  SmallTable,
  type SmallTableColumn,
} from "@/components/ui/small-table";
import { Button } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { FieldLabel } from "@/components/tailgrids/core/field";
import { Input } from "@/components/tailgrids/core/input";
import { usePaginationLimit } from "@/hooks/use-pagination-limit";
import { useT } from "@/core/i18n";

interface SpineRole {
  id: number;
  name: string;
  permissions: string[];
}

/** Group permission "feature:capability" -> {feature: [capability,...]}. */
function groupPermissions(all: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const p of all) {
    const [feature, capability] = p.split(":");
    (groups[feature] ??= []).push(capability ?? "");
  }
  return groups;
}

const PROTECTED_ROLE = "admin";

export default function RolesPage() {
  const { token, user: me } = useAuth();
  const t = useT();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SpineRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const h = Number(window.location.hash.replace("#", ""));
    return h || null;
  });
  // POLA: state smallView di parent — bukan di SmallTable.
  const [smallView, setSmallView] = useState(true);

  const canView = can(me, "roles:view");
  const canCreate = can(me, "roles:create");
  const canEdit = can(me, "roles:edit");
  const canDelete = can(me, "roles:delete");

  const { data: roles = [], isPending } = useQuery({
    queryKey: ["spine", "roles", token],
    queryFn: async () => {
      const res = await api<{ data: SpineRole[] }>("/api/v1/roles");
      if (!res.ok) throw new Error(res.error ?? t("Failed to load"));
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ["spine", "permissions", token],
    queryFn: async () => {
      const res = await api<{ data: string[] }>("/api/v1/permissions");
      if (!res.ok) throw new Error(res.error ?? t("Failed to load permissions"));
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && (canView || canCreate || canEdit),
  });

  const permissionGroups = groupPermissions(allPermissions);

  const columns: SmallTableColumn<SpineRole>[] = [
    {
      key: "id",
      label: "ID",
      primary: true,
      render: (it) => <span className="text-text-tertiary">#{it.id}</span>,
    },
    {
      key: "name",
      label: t("Role"),
      primary: true,
      render: (it) => (
        <span className="font-medium text-text-primary">
          {it.name}
          {it.name === PROTECTED_ROLE && (
            <span className="ml-2 rounded-md bg-badge-warning-background px-2 py-0.5 text-xs text-badge-warning-text">
              protected
            </span>
          )}
        </span>
      ),
    },
    {
      key: "permissions",
      label: t("Permissions"),
      render: (it) => (
        <span className="text-text-secondary">{it.permissions.length}</span>
      ),
    },
  ];

  const overviewTabs = [{ slug: "overview", label: t("Overview"), api: "", position: 0 }];
  const detailCustom = {
    permissions: (v: unknown) => {
      const list = (v as string[]) ?? [];
      return list.length === 0 ? (
        <span className="text-text-tertiary">—</span>
      ) : (
        <span className="flex flex-wrap gap-1">
          {list.map((p) => (
            <span
              key={p}
              className="rounded-md bg-background-gray-primary px-2 py-0.5 text-xs text-text-secondary"
            >
              {p}
            </span>
          ))}
        </span>
      );
    },
  };

  function selectItem(id: number | string) {
    const n = Number(id);
    setSelectedId(n);
    // POLA: klik row → selectItem + setSmallView(true) (auto-expand).
    setSmallView(true);
    window.location.hash = String(n);
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setChecked({});
    setError(null);
    setOpen(true);
  }

  function openEdit(role: SpineRole) {
    setEditing(role);
    setName(role.name);
    const init: Record<string, boolean> = {};
    for (const p of role.permissions) init[p] = true;
    setChecked(init);
    setError(null);
    setOpen(true);
  }

  function togglePermission(p: string) {
    setChecked((c) => ({ ...c, [p]: !c[p] }));
  }

  async function onSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const permissions = Object.entries(checked)
        .filter(([, on]) => on)
        .map(([p]) => p);
      const res = await api(
        editing ? `/api/v1/roles/${editing.id}` : "/api/v1/roles",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify({ name: name.trim(), permissions }),
        }
      );
      if (!res.ok) {
        setError(res.error ?? t("Failed to save"));
        return;
      }
      const savedId = (res.data as SpineRole).id;
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["spine", "roles"] });
      // Daftar roles juga dipakai halaman Users (assign) — segarkan.
      await qc.invalidateQueries({ queryKey: ["spine", "roles"], refetchType: "all" });
      selectItem(savedId);
      setRefreshKey((k) => k + 1);
    } catch {
      setError(t("Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: SpineRole) {
    if (!window.confirm(`Hapus role ${item.name}?`)) return;
    const res = await api(`/api/v1/roles/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(res.error ?? t("Failed to delete"));
      return;
    }
    if (selectedId === item.id) {
      setSelectedId(null);
      window.location.hash = "";
    }
    await qc.invalidateQueries({ queryKey: ["spine", "roles"] });
    setRefreshKey((k) => k + 1);
  }

  if (!canView) {
    return (
      <p className="text-sm text-text-tertiary">
        Anda tidak memiliki akses ke manajemen role.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Roles</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Role & permission (feature:capability). Role &quot;admin&quot; dilindungi.
          </p>
        </div>
        {canCreate && <Button onClick={openCreate}>Add Role</Button>}
      </div>

      {error && <p className="text-sm text-text-tertiary">{error}</p>}

      {isPending ? (
        <p className="text-sm text-text-tertiary">{t("Loading...")}</p>
      ) : (
        <SmallTable
          items={roles}
          tabs={overviewTabs}
          columns={columns}
          selectedId={selectedId}
          onSelectId={selectItem}
          getItemId={(it) => it.id}
          showDetail={smallView}
          refreshKey={refreshKey}
          perPage={perPage}
          tabCustomValue={detailCustom}
          getSearchText={(it) => `${it.name} ${it.permissions.join(" ")}`}
          tabHideKeys={["id", "name"]}
          renderHeader={(it) => (
            <span className="flex items-center gap-2">
              <span>#{it.id}</span>
              <span className="text-text-primary">{it.name}</span>
              <span className="text-xs text-text-tertiary">
                {it.permissions.length} permissions
              </span>
            </span>
          )}
          toolbar={(item) => (
            <>
              {canEdit && item.name !== PROTECTED_ROLE && (
                <Button appearance="outline" onClick={() => openEdit(item)}>
                  Edit
                </Button>
              )}
              {canDelete && item.name !== PROTECTED_ROLE && (
                <Button appearance="outline" onClick={() => onDelete(item)}>
                  Delete
                </Button>
              )}
              <Button
                appearance="outline"
                onClick={() => setSmallView((v) => !v)}
              >
                {smallView ? "◀" : "▶"}
              </Button>
            </>
          )}
        />
      )}

      {open && (
        <Dialog isOpen={open} onOpenChange={setOpen}>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Role ${editing.name}` : "Create Role"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <FieldLabel htmlFor="f-role-name">Role name</FieldLabel>
              <Input
                id="f-role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <FieldLabel>Permissions</FieldLabel>
              <div className="mt-1.5 max-h-72 space-y-4 overflow-y-auto rounded-lg border border-card-border p-3">
                {Object.keys(permissionGroups).length === 0 && (
                  <p className="text-sm text-text-tertiary">{t("No permissions yet.")}</p>
                )}
                {Object.entries(permissionGroups).map(([feature, caps]) => (
                  <div key={feature}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                      {feature}
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                      {caps.map((cap) => {
                        const p = `${feature}:${cap}`;
                        return (
                          <Checkbox
                            key={p}
                            isSelected={Boolean(checked[p])}
                            onChange={() => togglePermission(p)}
                          >
                            <span className="text-sm text-text-secondary">{cap}</span>
                          </Checkbox>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-text-tertiary">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button
              appearance="outline"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              {t("Cancel")}
            </Button>
            <Button onClick={onSave} isDisabled={saving || !name.trim()}>
              {saving ? t("Saving...") : t("Save")}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
