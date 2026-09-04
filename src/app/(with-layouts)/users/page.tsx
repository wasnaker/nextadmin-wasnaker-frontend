"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/services/spine/api";
import { can, useAuth } from "@/services/spine/auth-context";
import { startImpersonate } from "@/components/common/impersonate-banner";
import {
  SmallTable,
  type SmallTableColumn,
} from "@/components/spine/small-table";
import { StatusBadge } from "@/components/spine/status-badge";
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
import { usePaginationLimit } from "@/services/spine/use-pagination-limit";

interface SpineUser {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  roles: string[];
}

interface SpineRole {
  id: number;
  name: string;
  permissions: string[];
}

const EMPTY_FORM = { name: "", email: "", password: "", is_active: true, roles: [] as string[] };

export default function UsersPage() {
  const router = useRouter();
  const { token, user: me, signIn } = useAuth();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SpineUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const h = Number(window.location.hash.replace("#", ""));
    return h || null;
  });

  const canView = can(me, "users:view");
  const canCreate = can(me, "users:create");
  const canEdit = can(me, "users:edit");
  const canDelete = can(me, "users:delete");
  const canImpersonate = can(me, "impersonate:use");

  const [impBusy, setImpBusy] = useState<number | null>(null);

  async function onImpersonate(item: SpineUser) {
    setImpBusy(item.id);
    setError(null);
    try {
      const r = await startImpersonate(item.id, signIn, router.push);
      if (!r.ok) setError(r.error ?? "Gagal impersonate");
    } catch {
      setError("Gagal impersonate");
    } finally {
      setImpBusy(null);
    }
  }

  const { data: items = [], isPending } = useQuery({
    queryKey: ["spine", "users", token],
    queryFn: async () => {
      const res = await api<{ data: SpineUser[] }>("/api/v1/users");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  // Daftar role utk assign (permission roles:view ATAU users:edit via backend).
  const { data: roles = [] } = useQuery({
    queryKey: ["spine", "roles", token],
    queryFn: async () => {
      const res = await api<{ data: SpineRole[] }>("/api/v1/roles");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat role");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && (canView || canEdit),
  });

  const columns: SmallTableColumn<SpineUser>[] = [
    {
      key: "id",
      label: "ID",
      primary: true,
      render: (it) => <span className="text-text-tertiary">#{it.id}</span>,
    },
    {
      key: "name",
      label: "Name",
      primary: true,
      render: (it) => <span className="font-medium text-text-primary">{it.name}</span>,
    },
    {
      key: "email",
      label: "Email",
      primary: true,
      render: (it) => <span className="text-text-secondary">{it.email}</span>,
    },
    {
      key: "roles",
      label: "Roles",
      render: (it) => (
        <span className="flex flex-wrap gap-1">
          {it.roles.length === 0 && <span className="text-text-tertiary">—</span>}
          {it.roles.map((r) => (
            <span
              key={r}
              className="rounded-md bg-background-gray-primary px-2 py-0.5 text-xs text-text-secondary"
            >
              {r}
            </span>
          ))}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (it) => <StatusBadge status={it.is_active ? "active" : "inactive"} />,
    },
    ...(canImpersonate
      ? [
          {
            key: "impersonate",
            label: "",
            render: (it: SpineUser) =>
              it.id !== me?.id && !it.roles.includes("admin") ? (
                <Button
                  appearance="outline"
                  size="sm"
                  isDisabled={impBusy !== null}
                  onPress={() => onImpersonate(it)}
                  className="h-7 px-2.5 text-xs"
                >
                  {impBusy === it.id ? "Masuk..." : "Masuk sbg"}
                </Button>
              ) : null,
          },
        ]
      : []),
  ];

  // Panel detail tanpa modul: tab "overview" render data dari client (inline),
  // api dummy tidak pernah di-fetch (TabContent pakai inlineData).
  const overviewTabs = [{ slug: "overview", label: "Overview", api: "", position: 0 }];
  const detailCustom = {
    is_active: (v: unknown) => (
      <StatusBadge status={v ? "active" : "inactive"} />
    ),
    roles: (v: unknown) => {
      const list = (v as string[]) ?? [];
      return list.length === 0 ? (
        <span className="text-text-tertiary">—</span>
      ) : (
        <span className="flex flex-wrap gap-1">
          {list.map((r) => (
            <span
              key={r}
              className="rounded-md bg-background-gray-primary px-2 py-0.5 text-xs text-text-secondary"
            >
              {r}
            </span>
          ))}
        </span>
      );
    },
  };

  function selectItem(id: number | string) {
    const n = Number(id);
    setSelectedId(n);
    window.location.hash = String(n);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(item: SpineUser) {
    setEditing(item);
    setForm({
      name: item.name,
      email: item.email,
      password: "",
      is_active: item.is_active,
      roles: item.roles,
    });
    setError(null);
    setOpen(true);
  }

  function toggleRole(name: string) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(name)
        ? f.roles.filter((r) => r !== name)
        : [...f.roles, name],
    }));
  }

  async function onSave() {
    if (!form.name.trim() || !form.email.trim()) return;
    if (!editing && form.password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        is_active: form.is_active,
        roles: form.roles,
      };
      if (form.password) payload.password = form.password;
      const res = await api(editing ? `/api/v1/users/${editing.id}` : "/api/v1/users", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(res.error ?? "Gagal menyimpan");
        return;
      }
      const savedId = (res.data as SpineUser).id;
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["spine", "users"] });
      selectItem(savedId);
      setRefreshKey((k) => k + 1);
    } catch {
      setError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive(item: SpineUser) {
    const res = await api(`/api/v1/users/${item.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: item.name,
        email: item.email,
        is_active: !item.is_active,
        roles: item.roles,
      }),
    });
    if (!res.ok) {
      setError(res.error ?? "Gagal ubah status");
      return;
    }
    if (item.id === me?.id) {
      // Nonaktif akun sendiri ditolak backend (422) — tidak terjadi.
    }
    await qc.invalidateQueries({ queryKey: ["spine", "users"] });
    setRefreshKey((k) => k + 1);
  }

  async function onDelete(item: SpineUser) {
    if (!window.confirm(`Hapus user ${item.name} (${item.email})?`)) return;
    const res = await api(`/api/v1/users/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(res.error ?? "Gagal menghapus");
      return;
    }
    if (selectedId === item.id) {
      setSelectedId(null);
      window.location.hash = "";
    }
    await qc.invalidateQueries({ queryKey: ["spine", "users"] });
    setRefreshKey((k) => k + 1);
  }

  if (!canView) {
    return (
      <p className="text-sm text-text-tertiary">
        Anda tidak memiliki akses ke manajemen user.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Users</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Akun internal (staff). Role & permission diatur per user.
          </p>
        </div>
        {canCreate && <Button onClick={openCreate}>Add User</Button>}
      </div>

      {error && <p className="text-sm text-text-tertiary">{error}</p>}

      {isPending ? (
        <p className="text-sm text-text-tertiary">Memuat...</p>
      ) : (
        <SmallTable
          items={items}
          tabs={overviewTabs}
          columns={columns}
          selectedId={selectedId}
          onSelectId={selectItem}
          getItemId={(it) => it.id}
          showDetail
          refreshKey={refreshKey}
          perPage={perPage}
          tabCustomValue={detailCustom}
          getSearchText={(it) => `${it.name} ${it.email} ${it.roles.join(" ")}`}
          tabHideKeys={["id", "name"]}
          renderHeader={(it) => (
            <span className="flex items-center gap-2">
              <StatusBadge status={it.is_active ? "active" : "inactive"} />
              <span>#{it.id}</span>
              <span className="text-text-primary">{it.name}</span>
            </span>
          )}
          toolbar={(item) => (
            <>
              {canEdit && (
                <>
                  <Button appearance="outline" onClick={() => openEdit(item)}>
                    Edit
                  </Button>
                  <Button appearance="outline" onClick={() => onToggleActive(item)}>
                    {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </>
              )}
              {canDelete && (
                <Button appearance="outline" onClick={() => onDelete(item)}>
                  Delete
                </Button>
              )}
            </>
          )}
        />
      )}

      {open && (
        <Dialog isOpen={open} onOpenChange={setOpen}>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit User #${editing.id}` : "Create User"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <FieldLabel htmlFor="f-name">Name</FieldLabel>
              <Input
                id="f-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-email">Email</FieldLabel>
              <Input
                id="f-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-password">
                {editing ? "Password baru (kosongkan = tetap)" : "Password"}
              </FieldLabel>
              <Input
                id="f-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <FieldLabel>Roles</FieldLabel>
              <div className="mt-1.5 space-y-1.5">
                {roles.length === 0 && (
                  <p className="text-sm text-text-tertiary">Belum ada role.</p>
                )}
                {roles.map((r) => (
                  <Checkbox
                    key={r.id}
                    isSelected={form.roles.includes(r.name)}
                    onChange={() => toggleRole(r.name)}
                  >
                    <span className="text-sm text-text-secondary">{r.name}</span>
                  </Checkbox>
                ))}
              </div>
            </div>
            <div>
              <Checkbox
                isSelected={form.is_active}
                onChange={(v) => setForm({ ...form, is_active: Boolean(v) })}
              >
                <span className="text-sm text-text-secondary">Akun aktif</span>
              </Checkbox>
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
              Batal
            </Button>
            <Button onClick={onSave} isDisabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
