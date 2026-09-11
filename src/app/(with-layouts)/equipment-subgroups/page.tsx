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
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";
import { usePaginationLimit } from "@/services/spine/use-pagination-limit";
import { useModuleExtensions } from "@/services/spine/module-extensions";
import { useT } from "@/services/i18n";

interface EquipmentSubgroup {
  id: number;
  ulid?: string;
  code: string;
  name: string;
  group_id: number;
  is_active: boolean;
  group?: { id: number; code: string; name: string } | null;
}

interface Group {
  id: number;
  code: string;
  name: string;
}

const EMPTY_FORM = { code: "", name: "", group_id: "", is_active: true };

/** Equipment Subgroups — anak group. */
export default function EquipmentSubgroupsPage() {
  const { token, user: me } = useAuth();
  const t = useT();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentSubgroup | null>(null);
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
    queryKey: ["spine", "equipment-subgroups", token],
    queryFn: async () => {
      const res = await api<{ data: EquipmentSubgroup[] }>("/api/v1/equipment-subgroups");
      if (!res.ok) throw new Error(res.error ?? t("Failed to load"));
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["spine", "equipment-groups", token],
    queryFn: async () => {
      const res = await api<{ data: Group[] }>("/api/v1/equipment-groups");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: ext } = useModuleExtensions();
  const tabs = useMemo(
    () =>
      (ext?.detail_tabs["equipment"] ?? [])
        .filter((t) => t.api.includes("/api/v1/equipment-subgroups/"))
        .sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
    [ext]
  );

  const columns: SmallTableColumn<EquipmentSubgroup>[] = [
    {
      key: "id",
      label: "ID",
      primary: true,
      render: (it) => <span className="text-text-tertiary">#{it.id}</span>,
    },
    {
      key: "name",
      label: t("Subgroup Name"),
      primary: true,
      render: (it) => <span className="text-text-secondary">{it.name}</span>,
    },
    {
      key: "group",
      label: t("Group"),
      render: (it) =>
        it.group ? (
          <span className="text-text-secondary">{it.group.name}</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: "code",
      label: t("Subgroup Code"),
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

  function openEdit(item: EquipmentSubgroup) {
    setEditing(item);
    setForm({
      code: item.code,
      name: item.name,
      group_id: String(item.group_id ?? ""),
      is_active: item.is_active,
    });
    setError(null);
    setOpen(true);
  }

  async function onSave() {
    if (!form.code.trim() || !form.name.trim() || !form.group_id) {
      setError("Code, Name, dan Group wajib diisi");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        code: form.code.trim(),
        name: form.name.trim(),
        group_id: Number(form.group_id),
        is_active: form.is_active,
      };
      const res = await api(
        editing
          ? `/api/v1/equipment-subgroups/${editing.id}`
          : "/api/v1/equipment-subgroups",
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
      await qc.invalidateQueries({ queryKey: ["spine", "equipment-subgroups"] });
      const savedId = (res.data as EquipmentSubgroup).id;
      selectItem(savedId);
      setRefreshKey((k) => k + 1);
    } catch {
      setError(t("Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: EquipmentSubgroup) {
    if (!window.confirm(`Hapus subgroup ${item.name}?`)) return;
    const res = await api(`/api/v1/equipment-subgroups/${item.id}`, {
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
    await qc.invalidateQueries({ queryKey: ["spine", "equipment-subgroups"] });
    setRefreshKey((k) => k + 1);
  }

  if (!canView) {
    return (
      <p className="text-sm text-text-tertiary">
        Anda tidak memiliki akses ke subgroup equipment.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Equipment Subgroups
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Anak group (Group -&gt; Subgroup -&gt; Item).
          </p>
        </div>
        {canManage && <Button onClick={openCreate}>Add Subgroup</Button>}
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
          getSearchText={(it) =>
            `${it.code} ${it.name} ${it.group?.name ?? ""}`
          }
          tabHideKeys={["ulid", "id", "code", "group", "is_active", "equipments"]}
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
              {editing ? `Edit Subgroup #${editing.id}` : t("Add Subgroup")}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <FieldLabel>Group</FieldLabel>
              <Select
                value={form.group_id}
                onChange={(v) => setForm({ ...form, group_id: String(v ?? "") })}
                className="mt-1.5 w-full"
                aria-label={t("Group")}
              >
                <SelectLabel>Group</SelectLabel>
                <SelectTrigger className="w-full border-border-secondary bg-input-background py-2.5">
                  <SelectValue />
                  <SelectIndicator />
                </SelectTrigger>
                <SelectContent className="min-w-(--trigger-width)">
                  {groups.map((g) => (
                    <SelectItem key={g.id} id={String(g.id)} textValue={g.name}>
                      {g.code} — {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
