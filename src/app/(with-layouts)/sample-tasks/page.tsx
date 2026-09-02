"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_URL } from "@/services/spine/api";
import { useAuth } from "@/services/spine/auth-context";
import { useModuleExtensions } from "@/services/spine/module-extensions";
import { usePaginationLimit } from "@/services/spine/use-pagination-limit";
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

interface SampleTask {
  id: number;
  ulid?: string;
  sample_item_id: number;
  title: string;
  status: string;
  created_at?: string;
}

interface SampleItem {
  id: number;
  name: string;
}

const STATUSES = ["pending", "in_progress", "done"];

export default function SampleTasksPage() {
  const { token } = useAuth();
  const [smallView, setSmallView] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SampleTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ sample_item_id: "", title: "", status: "pending" });

  const qc = useQueryClient();
  const { data: ext } = useModuleExtensions();
  const tabs = ext?.detail_tabs["sampletasks"] ?? [];
  const perPage = usePaginationLimit();

  // Hash #id saat load via initializer (hindari set-state-in-effect).
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const h = Number(window.location.hash.replace("#", ""));
    return h || null;
  });

  const { data: items = [], isPending } = useQuery({
    queryKey: ["spine", "sample-tasks", token],
    queryFn: async () => {
      const res = await api<{ data: SampleTask[] }>("/api/v1/sample-tasks");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token),
  });

  // Parent list (Sample) — untuk kolom Parent + dropdown di dialog.
  const { data: parents = [] } = useQuery({
    queryKey: ["spine", "sample", token],
    queryFn: async () => {
      const res = await api<{ data: SampleItem[] }>("/api/v1/sample");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token),
  });

  const parentName = (id: number) =>
    parents.find((s) => s.id === id)?.name ?? `#${id}`;

  const columns: SmallTableColumn<SampleTask>[] = [
    {
      key: "id",
      label: "ID",
      primary: true,
      render: (it) => <span className="text-text-tertiary">#{it.id}</span>,
    },
    {
      key: "status",
      label: "Status",
      primary: true,
      render: (it) => <StatusBadge status={it.status} />,
    },
    {
      key: "title",
      label: "Title",
      primary: true,
      render: (it) => <span className="font-medium text-text-primary">{it.title}</span>,
    },
    {
      key: "sample_item_id",
      label: "Parent",
      render: (it) => <span className="text-text-secondary">{parentName(it.sample_item_id)}</span>,
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

  function selectItem(id: number | string) {
    const n = Number(id);
    setSelectedId(n);
    window.location.hash = String(n);
  }

  function openCreate() {
    setEditing(null);
    setForm({ sample_item_id: "", title: "", status: "pending" });
    setError(null);
    setOpen(true);
  }

  function openEdit(item: SampleTask) {
    setEditing(item);
    setForm({
      sample_item_id: String(item.sample_item_id),
      title: item.title,
      status: item.status,
    });
    setError(null);
    setOpen(true);
  }

  async function onSave() {
    if (!form.title.trim() || !form.sample_item_id) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        sample_item_id: Number(form.sample_item_id),
        title: form.title.trim(),
        status: form.status,
      };
      const res = await api(editing ? `/api/v1/sample-tasks/${editing.id}` : "/api/v1/sample-tasks", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(res.error ?? "Gagal menyimpan");
        return;
      }
      const savedId = (res.data as SampleTask).id;
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["spine", "sample-tasks"] });
      selectItem(savedId);
      setRefreshKey((k) => k + 1);
    } catch {
      setError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function onMarkDone(item: SampleTask) {
    if (item.status === "done") return;
    const res = await api(`/api/v1/sample-tasks/${item.id}`, {
      method: "PUT",
      body: JSON.stringify({ status: "done" }),
    });
    if (res.ok) {
      await qc.invalidateQueries({ queryKey: ["spine", "sample-tasks"] });
      setRefreshKey((k) => k + 1);
    } else {
      setError(res.error ?? "Gagal ubah status");
    }
  }

  function onPdf(item: SampleTask) {
    const html = encodeURIComponent(
      `<h1>Sample Task #${item.id} — ${item.title}</h1>` +
        `<p>Parent: ${parentName(item.sample_item_id)} | Status: ${item.status}</p>`
    );
    window.open(`${API_URL}/api/v1/pdf/from-html?html=${html}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Sample Tasks</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Child module SampleTasks — task milik SampleItem.
          </p>
        </div>
        <Button onClick={openCreate}>Add Task</Button>
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
          getSearchText={(it) => `${it.title} ${parentName(it.sample_item_id)}`}
          tabHideKeys={["ulid", "sample_item_id", "title"]}
          renderHeader={(it) => (
            <span className="flex items-center gap-2">
              <StatusBadge status={it.status} />
              <span>#{it.id}</span>
              <span className="text-text-primary">{it.title}</span>
            </span>
          )}
          toolbar={(item) => (
            <>
              {item.status !== "done" && (
                <Button appearance="outline" onClick={() => onMarkDone(item)}>
                  Mark as done
                </Button>
              )}
              <Button appearance="outline" onClick={() => openEdit(item)}>
                Edit
              </Button>
              <Button appearance="outline" onClick={() => onPdf(item)}>
                PDF
              </Button>
              <Button appearance="outline" onClick={() => setSmallView((v) => !v)}>
                {smallView ? "◀" : "▶"}
              </Button>
            </>
          )}
        />
      )}

      {open && (
        <Dialog isOpen={open} onOpenChange={setOpen}>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit Task #${editing.id}` : "Create Task"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <FieldLabel htmlFor="f-parent">Sample Item (parent)</FieldLabel>
              <select
                id="f-parent"
                value={form.sample_item_id}
                onChange={(e) => setForm({ ...form, sample_item_id: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-card-border bg-input-background px-4 py-2.5 text-title-50 outline-none focus:border-input-primary-focus-border"
              >
                <option value="">Pilih parent...</option>
                {parents.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="f-title">Title</FieldLabel>
              <Input
                id="f-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <FieldLabel htmlFor="f-status">Status</FieldLabel>
              <select
                id="f-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-card-border bg-input-background px-4 py-2.5 text-title-50 outline-none focus:border-input-primary-focus-border"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
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
            <Button onClick={onSave} isDisabled={saving || !form.title.trim() || !form.sample_item_id}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
