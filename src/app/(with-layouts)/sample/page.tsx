"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_URL, getToken, setToken } from "@/services/spine/api";
import { useModuleExtensions } from "@/services/spine/module-extensions";
import { usePaginationLimit } from "@/services/spine/use-pagination-limit";
import {
  SmallTable,
  type SmallTableColumn,
} from "@/components/spine/small-table";
import { StatusBadge } from "@/components/spine/status-badge";
import { Button } from "@/components/tailgrids/core/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/tailgrids/core/card";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { FieldLabel } from "@/components/tailgrids/core/field";
import { Input } from "@/components/tailgrids/core/input";

interface SampleItem {
  id: number;
  ulid?: string;
  name: string;
  status?: string;
  description?: string | null;
  quantity?: number;
  price?: string | number;
  created_at?: string;
}

const columns: SmallTableColumn<SampleItem>[] = [
  {
    key: "id",
    label: "ID",
    primary: true,
    render: (it) => <span className="text-text-tertiary">#{it.id}</span>,
  },
  {
    key: "name",
    label: "Nama",
    primary: true,
    render: (it) => <span className="font-medium text-text-primary">{it.name}</span>,
  },
  {
    key: "status",
    label: "Status",
    primary: true,
    render: (it) =>
      it.status ? (
        <StatusBadge status={it.status} />
      ) : (
        <span className="text-text-tertiary">—</span>
      ),
  },
  {
    key: "quantity",
    label: "Qty",
    render: (it) => <span className="text-text-secondary">{it.quantity ?? 0}</span>,
  },
  {
    key: "price",
    label: "Harga",
    render: (it) => (
      <span className="text-text-secondary">
        {it.price ? Number(it.price).toLocaleString("id-ID") : "0"}
      </span>
    ),
  },
  {
    key: "created_at",
    label: "Dibuat",
    render: (it) => (
      <span className="text-text-secondary">
        {it.created_at ? new Date(it.created_at).toLocaleDateString() : "—"}
      </span>
    ),
  },
];

export default function SamplePage() {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [smallView, setSmallView] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SampleItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", quantity: "", price: "" });

  // Hash #id (padanan do_hash_helper): pilih record dari URL saat load.
  // useState initializer — bukan effect (hindari set-state-in-effect).
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const h = Number(window.location.hash.replace("#", ""));
    return h || null;
  });

  const qc = useQueryClient();
  const { data: ext } = useModuleExtensions();
  const tabs = ext?.detail_tabs["sample"] ?? [];
  const perPage = usePaginationLimit();

  const { data: items = [], isPending } = useQuery({
    queryKey: ["spine", "sample", token],
    queryFn: async () => {
      const res = await api<{ data: SampleItem[] }>("/api/v1/sample");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token),
  });

  // Pilih item: update state + URL hash (#id) — hash HANYA saat klik baris.
  const selectItem = useCallback((id: number | string) => {
    const n = Number(id);
    setSelectedId(n);
    window.location.hash = String(n);
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const res = await api<{ token: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password"),
      }),
    });
    if (!res.ok) {
      setError(res.error ?? "Login gagal");
      return;
    }
    setToken(res.data.token);
    setTokenState(res.data.token);
    setError(null);
  }

  function onLogout() {
    setToken(null);
    setTokenState(null);
    window.location.hash = "";
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", quantity: "", price: "" });
    setError(null);
    setOpen(true);
  }

  function openEdit(item: SampleItem) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      quantity: item.quantity != null ? String(item.quantity) : "",
      price: item.price != null ? String(item.price) : "",
    });
    setError(null);
    setOpen(true);
  }

  async function onSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        quantity: form.quantity === "" ? 0 : Number(form.quantity),
        price: form.price === "" ? 0 : Number(form.price),
      };
      const res = await api(editing ? `/api/v1/sample/${editing.id}` : "/api/v1/sample", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(res.error ?? "Gagal menyimpan");
        return;
      }
      const savedId = (res.data as SampleItem).id;
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["spine", "sample"] });
      selectItem(savedId);
      setRefreshKey((k) => k + 1);
    } catch {
      setError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  // Mark as done: ubah status record aktif.
  async function onMarkDone(item: SampleItem) {
    const res = await api(`/api/v1/sample/${item.id}`, {
      method: "PUT",
      body: JSON.stringify({ status: "done" }),
    });
    if (res.ok) {
      await qc.invalidateQueries({ queryKey: ["spine", "sample"] });
      setRefreshKey((k) => k + 1);
    } else {
      setError(res.error ?? "Gagal ubah status");
    }
  }

  function onPdf(item: SampleItem) {
    const html = encodeURIComponent(
      `<h1>Sample #${item.id} — ${item.name}</h1><p>${item.description ?? ""}</p>` +
        `<p>Qty: ${item.quantity ?? 0} | Harga: ${item.price ?? 0}</p>`
    );
    window.open(`${API_URL}/api/v1/pdf/from-html?html=${html}`, "_blank");
  }

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader className="mb-4">
            <CardTitle>Masuk</CardTitle>
            <CardDescription>Login ke Spine untuk mengakses data.</CardDescription>
          </CardHeader>
          <form onSubmit={onLogin}>
            <CardContent className="space-y-4">
              <div>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" required defaultValue="demo@spine.test" className="mt-1.5 w-full" />
              </div>
              <div>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" name="password" type="password" required defaultValue="password" className="mt-1.5 w-full" />
              </div>
              {error && <p className="text-sm text-text-tertiary">{error}</p>}
              <Button type="submit" className="w-full">Masuk</Button>
            </CardContent>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Sample</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Modul contoh Spine — SmallTable (TanStack Table) + panel detail bertab.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreate}>Add Sample</Button>
          <Button appearance="outline" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-text-tertiary">{error}</p>}

      {isPending ? (
        <p className="text-sm text-text-tertiary">Memuat...</p>
      ) : (
        <SmallTable
          items={items}
          tabs={tabs}
          columns={columns}
          selectedId={selectedId}
          onSelectId={(id) => {
            selectItem(id);
            setSmallView(true);
          }}
          getItemId={(it) => it.id}
          showDetail={smallView}
          refreshKey={refreshKey}
          perPage={perPage}
          getSearchText={(it) => `${it.name} ${it.description ?? ""}`}
          tabHideKeys={["ulid", "name"]}
          renderHeader={(it) => (
            <span className="flex items-center gap-2">
              {it.status && <StatusBadge status={it.status} />}
              <span>#{it.id}</span>
              <span className="text-text-primary">{it.name}</span>
            </span>
          )}
          toolbar={(item) => (
            <>
              <Button appearance="outline" onClick={() => onMarkDone(item)}>
                Mark as done
              </Button>
              <Button appearance="outline" onClick={() => openEdit(item)}>
                Edit
              </Button>
              <Button appearance="outline" onClick={() => onPdf(item)}>
                PDF
              </Button>
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
            <DialogTitle>{editing ? `Edit Sample #${editing.id}` : "Create Sample"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <FieldLabel htmlFor="f-name">Nama</FieldLabel>
              <Input
                id="f-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-desc">Deskripsi</FieldLabel>
              <Input
                id="f-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1.5 w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="f-qty">Quantity</FieldLabel>
                <Input
                  id="f-qty"
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="mt-1.5 w-full"
                />
              </div>
              <div>
                <FieldLabel htmlFor="f-price">Harga</FieldLabel>
                <Input
                  id="f-price"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="mt-1.5 w-full"
                />
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
              Batal
            </Button>
            <Button onClick={onSave} isDisabled={saving || !form.name.trim()}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
