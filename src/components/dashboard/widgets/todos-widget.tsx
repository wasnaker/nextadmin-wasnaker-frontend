"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getToken } from "@/services/spine/api";
import { cn } from "@/utils/cn";

interface TodoItem {
  id: number;
  description: string;
  finished: boolean;
  datefinished?: string | null;
  item_order: number;
}

/**
 * Widget Todo — daftar todo pribadi + tambah/toggle/hapus.
 * Paritas legacy dashboard/widgets/todos.php (unfinished + finished, toggle
 * selesai). Drag-reorder + edit = menyusul bersama halaman Todo penuh.
 */
export function TodosWidget({ apiPath }: { apiPath: string }) {
  const qc = useQueryClient();
  const token = getToken();
  const [draft, setDraft] = useState("");

  const queryKey = ["spine", "widget", apiPath, token];
  const { data = [], isPending } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api<{ data: TodoItem[] }>(apiPath);
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat todo");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["spine", "widget", apiPath] });

  const toggle = useMutation({
    mutationFn: async (item: TodoItem) => {
      const res = await api(`/api/v1/todos/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ finished: !item.finished }),
      });
      if (!res.ok) throw new Error(res.error ?? "Gagal memperbarui");
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async (description: string) => {
      const res = await api("/api/v1/todos", {
        method: "POST",
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error(res.error ?? "Gagal menambah todo");
    },
    onSuccess: () => {
      setDraft("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await api(`/api/v1/todos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(res.error ?? "Gagal menghapus");
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const unfinished = data.filter((t) => !t.finished);
  const finished = data.filter((t) => t.finished);

  if (isPending) {
    return <p className="text-sm text-text-tertiary">Memuat todo…</p>;
  }

  return (
    <div className="space-y-3">
      {/* Tambah cepat */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const d = draft.trim();
          if (d) addItem.mutate(d);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Tambah todo…"
          className="min-w-0 flex-1 rounded-lg border border-card-border bg-card-background px-3 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-primary-300"
        />
        <button
          type="submit"
          disabled={!draft.trim() || addItem.isPending}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          Tambah
        </button>
      </form>

      <TodoList
        items={unfinished}
        empty="Belum ada todo."
        onToggle={(t) => toggle.mutate(t)}
        onRemove={(id) => remove.mutate(id)}
      />

      {finished.length > 0 && (
        <div>
          <p className="pb-1 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Selesai ({finished.length})
          </p>
          <TodoList
            items={finished}
            empty=""
            onToggle={(t) => toggle.mutate(t)}
            onRemove={(id) => remove.mutate(id)}
          />
        </div>
      )}
    </div>
  );
}

function TodoList({
  items,
  empty,
  onToggle,
  onRemove,
}: {
  items: TodoItem[];
  empty: string;
  onToggle: (item: TodoItem) => void;
  onRemove: (id: number) => void;
}) {
  if (items.length === 0) {
    return empty ? <p className="text-sm text-text-tertiary">{empty}</p> : null;
  }
  return (
    <ul className="divide-y divide-card-border rounded-lg border border-card-border">
      {items.map((t) => (
        <li key={t.id} className="flex items-center gap-2 px-3 py-1.5">
          <input
            type="checkbox"
            checked={t.finished}
            onChange={() => onToggle(t)}
            className="size-3.5 shrink-0 accent-primary-600"
          />
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              t.finished
                ? "text-text-tertiary line-through"
                : "text-text-primary"
            )}
          >
            {t.description}
          </span>
          <button
            type="button"
            aria-label={`Hapus ${t.description}`}
            onClick={() => onRemove(t.id)}
            className="shrink-0 rounded p-1 text-xs text-text-tertiary transition-colors hover:bg-card-hover hover:text-error"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
