"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { can, useAuth } from "@/services/spine/auth-context";
import {
  SmallTable,
  type SmallTableColumn,
} from "@/components/spine/small-table";
import { StatusBadge } from "@/components/spine/status-badge";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { FieldLabel } from "@/components/tailgrids/core/field";
import { Input } from "@/components/tailgrids/core/input";
import { usePaginationLimit } from "@/services/spine/use-pagination-limit";
import { useModuleExtensions } from "@/services/spine/module-extensions";
import { useT } from "@/services/i18n";

interface EquipmentGroup {
  id: number;
  ulid?: string;
  code: string;
  name: string;
  is_active: boolean;
}

const EMPTY_FORM = { code: "", name: "", is_active: true };

/** Equipment Groups — level tertinggi katalog. */
export default function EquipmentGroupsPage() {
  const { token, user: me } = useAuth();
  const t = useT();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [smallView, setSmallView] = useState(true);

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const h = Number(window.location.hash.replace("#", ""));
    return h || null;
  });

  const canView = can(me, "equipment:view");
  const canManage = can(me, "equipment:create") || can(me, "equipment:edit");

  const { data: items = [], isPending } = useQuery({
    queryKey: ["spine", "equipment-groups", token],
    queryFn: async () => {
      const res = await api<{ data: EquipmentGroup[] }>("/api/v1/equipment-groups");
      if (!res.ok) throw new Error(res.error ?? t("Failed to load"));
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: ext } = useModuleExtensions();
  const tabs = useMemo(
    () =>
      (ext?.detail_tabs["equipment"] ?? [])
        .filter((t) => t.api.includes("/api/v1/equipment-groups/"))
        .sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
    [ext]
  );

  const columns: SmallTableColumn<EquipmentGroup>[] = [
    {
      key: "id",
      label: "ID",
      primary: true,
      render: (it) => <span className="text-text-tertiary">#{it.id}</span>,
    },
    {
      key: "name",
      label: t("Group Name"),
      primary: true,
      render: (it) => <span className="text-text-secondary">{it.name}</span>,
    },
    {
      key: "code",
      label: t("Group Code"),
      render: (it) => (
        <span className="font-mono text-sm text-text-primary">{it.code}</span>
      ),
    },
    {
      key: "is_active",
      label: t("Status"),
      render: (it) => (
        <StatusBadge status={it.is_active ? "active" : "inactive"} />
      ),
    },
  ];

  function selectItem(id: number | string) {
    const n = Number(id);
    setSelectedId(n);
    window.location.hash = String(n);
    setSmallView(true);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(item: EquipmentGroup) {
    setEditing(item);
    setForm({ code: item.code, name: item.name, is_active: item.is_active });
    setError(null);
    setOpen(true);
  }

  async function onSave() {
    if (!form.code.trim() || !form.name.trim()) {
      setError("Code dan Name wajib diisi");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        code: form.code.trim(),
        name: form.name.trim(),
        is_active: form.is_active,
      };
      const res = await api(
        editing ? `/api/v1/equipment-groups/${editing.id}` : "/api/v1/equipment-groups",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        setError(res.error ?? t("Failed to save"));
        return;
      }
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["spine", "equipment-groups"] });
      const savedId = (res.data as EquipmentGroup).id;
      selectItem(savedId);
      setRefreshKey((k) => k + 1);
    } catch {
      setError(t("Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: EquipmentGroup) {
    if (!window.confirm(`Hapus group ${item.name}?`)) return;
    const res = await api(`/api/v1/equipment-groups/${item.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(res.error ?? t("Failed to delete"));
      return;
    }
    if (selectedId === item.id) {
      setSelectedId(null);
      window.location.hash = "";
      setSmallView(false);
    }
    await qc.invalidateQueries({ queryKey: ["spine", "equipment-groups"] });
    setRefreshKey((k) => k + 1);
  }

  if (!canView) {
    return (
      <p className="text-sm text-text-tertiary">
        Anda tidak memiliki akses ke group equipment.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Equipment Groups
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Level tertinggi katalog (Group -&gt; Subgroup -&gt; Item).
          </p>
        </div>
        {canManage && <Button onClick={openCreate}>Add Group</Button>}
      </div>

      {error && <p className="text-sm text-text-tertiary">{error}</p>}

      {isPending ? (
        <p className="text-sm text-text-tertiary">{t("Loading...")}</p>
      ) : (
        <SmallTable
          items={items}
          tabs={tabs}
          columns={columns}
          selectedId={selectedId}
          onSelectId={selectItem}
          getItemId={(it) => it.id}
          showDetail={smallView}
          refreshKey={refreshKey}
          perPage={perPage}
          getSearchText={(it) => `${it.code} ${it.name}`}
          tabHideKeys={["ulid", "id", "code", "is_active", "subgroups"]}
          renderHeader={(it) => (
            <span className="flex items-center gap-2">
              <span className="font-mono text-text-primary">{it.code}</span>
              <span className="text-text-tertiary">#{it.id}</span>
            </span>
          )}
          toolbar={(item) =>
            canManage ? (
              <>
                <Button appearance="outline" onClick={() => openEdit(item)}>
                  Edit
                </Button>
                {can(me, "equipment:delete") && (
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
            ) : null
          }
        />
      )}

      {open && (
        <Dialog isOpen={open} onOpenChange={setOpen}>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit Group #${editing.id}` : t("Add Group")}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="f-code">Code</FieldLabel>
                <Input
                  id="f-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="mt-1.5 w-full font-mono"
                />
              </div>
              <div>
                <FieldLabel htmlFor="f-name">Name</FieldLabel>
                <Input
                  id="f-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1.5 w-full"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              Active
            </label>
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
            <Button onClick={onSave} isDisabled={saving}>
              {saving ? t("Saving...") : t("Save")}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
