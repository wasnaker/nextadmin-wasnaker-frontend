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

interface Equipment {
  id: number;
  ulid?: string;
  code: string;
  name: string;
  description?: string | null;
  rate?: string | number;
  unit?: string | null;
  subgroup_id: number;
  category_id?: number | null;
  status: string;
  admin_id?: number | null;
  group_name?: string | null;
  subgroup?: { id: number; code: string; name: string; group?: { id: number; code: string; name: string } | null } | null;
  category?: { id: number; code: string; name: string } | null;
}

interface Subgroup {
  id: number;
  code: string;
  name: string;
}

interface Category {
  id: number;
  code: string;
  name: string;
}

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  rate: "",
  unit: "",
  subgroup_id: "",
  category_id: "",
  status: "draft",
};

const STATUSES = ["draft", "active", "inactive", "expired"];

/** Equipments — item katalog (Group -> Subgroup -> Item). */
export default function EquipmentsPage() {
  const { token, user: me } = useAuth();
  const t = useT();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
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
    queryKey: ["spine", "equipments", token],
    queryFn: async () => {
      const res = await api<{ data: Equipment[] }>("/api/v1/equipments");
      if (!res.ok) throw new Error(res.error ?? t("Failed to load"));
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: subgroups = [] } = useQuery({
    queryKey: ["spine", "equipment-subgroups", token],
    queryFn: async () => {
      const res = await api<{ data: Subgroup[] }>("/api/v1/equipment-subgroups");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["spine", "equipment-categories", token],
    queryFn: async () => {
      const res = await api<{ data: Category[] }>("/api/v1/equipment-categories");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: ext } = useModuleExtensions();
  const tabs = useMemo(
    () =>
      (ext?.detail_tabs["equipment"] ?? [])
        .filter((t) => t.api.includes("/api/v1/equipments/"))
        .sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
    [ext]
  );

  const columns: SmallTableColumn<Equipment>[] = [
    {
      key: "id",
      label: "ID",
      primary: true,
      render: (it) => <span className="text-text-tertiary">#{it.id}</span>,
    },
    {
      key: "code",
      label: t("Code"),
      primary: true,
      render: (it) => (
        <span className="font-mono text-sm text-text-primary">{it.code}</span>
      ),
    },
    {
      key: "name",
      label: t("Name"),
      render: (it) => <span className="text-text-secondary">{it.name}</span>,
    },
    {
      key: "category",
      label: "Category",
      render: (it) =>
        it.category ? (
          <span className="text-text-secondary">{it.category.name}</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: "subgroup",
      label: t("Subgroup"),
      render: (it) =>
        it.subgroup ? (
          <span className="text-text-secondary">{it.subgroup.name}</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: "group_name",
      label: t("Group"),
      render: (it) =>
        it.group_name ? (
          <span className="text-text-secondary">{it.group_name}</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: "status",
      label: t("Status"),
      render: (it) => <StatusBadge status={it.status} />,
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

  function openEdit(item: Equipment) {
    setEditing(item);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description ?? "",
      rate: String(item.rate ?? ""),
      unit: item.unit ?? "",
      subgroup_id: String(item.subgroup_id ?? ""),
      category_id: item.category_id ? String(item.category_id) : "",
      status: item.status,
    });
    setError(null);
    setOpen(true);
  }

  async function onSave() {
    if (!form.code.trim() || !form.name.trim() || !form.subgroup_id) {
      setError("Code, Name, dan Subgroup wajib diisi");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        rate: form.rate === "" ? 0 : Number(form.rate),
        unit: form.unit.trim() || null,
        subgroup_id: Number(form.subgroup_id),
        category_id: form.category_id ? Number(form.category_id) : null,
        status: form.status,
      };
      const res = await api(
        editing ? `/api/v1/equipments/${editing.id}` : "/api/v1/equipments",
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
      await qc.invalidateQueries({ queryKey: ["spine", "equipments"] });
      const savedId = (res.data as Equipment).id;
      selectItem(savedId);
      setRefreshKey((k) => k + 1);
    } catch {
      setError(t("Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: Equipment) {
    if (!window.confirm(`Hapus equipment ${item.name}?`)) return;
    const res = await api(`/api/v1/equipments/${item.id}`, {
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
    await qc.invalidateQueries({ queryKey: ["spine", "equipments"] });
    setRefreshKey((k) => k + 1);
  }

  if (!canView) {
    return (
      <p className="text-sm text-text-tertiary">
        Anda tidak memiliki akses ke katalog equipment.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Equipments
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Item katalog equipment (Group -&gt; Subgroup -&gt; Item).
          </p>
        </div>
        {canManage && <Button onClick={openCreate}>Add Equipment</Button>}
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
            `${it.code} ${it.name} ${it.subgroup?.name ?? ""} ${it.category?.name ?? ""}`
          }
          tabHideKeys={["ulid", "id", "code", "properties", "subgroup_id", "category_id", "admin_id", "admin", "created_at", "updated_at", "deleted_at"]}
          tabCustomValue={{
            category: (v) =>
              v && typeof v === "object" ? (
                <span className="text-text-primary">
                  {(v as { name?: string }).name ?? "—"}
                </span>
              ) : (
                "—"
              ),
            subgroup: (v) =>
              v && typeof v === "object" ? (
                <span className="text-text-primary">
                  {(v as { name?: string }).name ?? "—"}
                </span>
              ) : (
                "—"
              ),
          }}
          renderHeader={(it) => (
            <span className="flex items-center gap-2">
              <StatusBadge status={it.status} />
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
              {editing ? `Edit Equipment #${editing.id}` : t("Add Equipment")}
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
            <div>
              <FieldLabel htmlFor="f-desc">Description (opsional)</FieldLabel>
              <Input
                id="f-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1.5 w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Subgroup</FieldLabel>
                <Select
                  value={form.subgroup_id}
                  onChange={(v) =>
                    setForm({ ...form, subgroup_id: String(v ?? "") })
                  }
                  className="mt-1.5 w-full"
                  aria-label={t("Subgroup")}
                >
                  <SelectLabel>Subgroup</SelectLabel>
                  <SelectTrigger className="w-full border-border-secondary bg-input-background py-2.5">
                    <SelectValue />
                    <SelectIndicator />
                  </SelectTrigger>
                  <SelectContent className="min-w-(--trigger-width)">
                    {subgroups.map((s) => (
                      <SelectItem key={s.id} id={String(s.id)} textValue={s.name}>
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Category (opsional)</FieldLabel>
                <Select
                  value={form.category_id}
                  onChange={(v) =>
                    setForm({ ...form, category_id: String(v ?? "") })
                  }
                  className="mt-1.5 w-full"
                  aria-label="Category"
                >
                  <SelectLabel>Category</SelectLabel>
                  <SelectTrigger className="w-full border-border-secondary bg-input-background py-2.5">
                    <SelectValue />
                    <SelectIndicator />
                  </SelectTrigger>
                  <SelectContent className="min-w-(--trigger-width)">
                    {categories.map((c) => (
                      <SelectItem key={c.id} id={String(c.id)} textValue={c.name}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel htmlFor="f-rate">Rate</FieldLabel>
                <Input
                  id="f-rate"
                  type="number"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  className="mt-1.5 w-full"
                />
              </div>
              <div>
                <FieldLabel htmlFor="f-unit">Unit</FieldLabel>
                <Input
                  id="f-unit"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="mt-1.5 w-full"
                />
              </div>
              <div>
                <FieldLabel>{t("Status")}</FieldLabel>
                <Select
                  value={form.status}
                  onChange={(v) => setForm({ ...form, status: String(v ?? "draft") })}
                  className="mt-1.5 w-full"
                  aria-label={t("Status")}
                >
                  <SelectLabel>{t("Status")}</SelectLabel>
                  <SelectTrigger className="w-full border-border-secondary bg-input-background py-2.5">
                    <SelectValue />
                    <SelectIndicator />
                  </SelectTrigger>
                  <SelectContent className="min-w-(--trigger-width)">
                    {STATUSES.map((s) => (
                      <SelectItem key={s} id={s} textValue={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <Button onClick={onSave} isDisabled={saving}>
              {saving ? t("Saving...") : t("Save")}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
