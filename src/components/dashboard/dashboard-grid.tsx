"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { DragDropProvider, DragOverlay, useDroppable } from "@dnd-kit/react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/react";
import { CollisionPriority } from "@dnd-kit/abstract";
import { isSortable } from "@dnd-kit/react/sortable";
import type { ModuleWidget } from "@/services/spine/module-extensions";
import { useModuleExtensions } from "@/services/spine/module-extensions";
import {
  useDashboardState,
  useSaveDashboardLayout,
  useSaveDashboardVisibility,
  useResetDashboard,
  type DashboardState,
} from "@/services/spine/dashboard-state";
import {
  DASHBOARD_AREAS,
  AREA_LABELS,
  resolveDashboardLayout,
  isWidgetVisible,
} from "./dashboard-merge";
import { DashboardWidgetCard } from "./dashboard-widget-card";
import { cn } from "@/utils/cn";

type LayoutMap = Record<string, string[]>;

/** Id per area dari state saat ini (default bila layout null). */
function idsByArea(
  layout: Record<string, string[]> | null | undefined,
  widgets: ModuleWidget[]
): LayoutMap {
  const resolved = resolveDashboardLayout(layout ?? null, widgets);
  return Object.fromEntries(
    DASHBOARD_AREAS.map((a) => [a, resolved[a].map((w) => w.id)])
  );
}

/** Pindahkan 1 item antar/dalam area -> LayoutMap baru (immutable). */
function moveItem(
  map: LayoutMap,
  widgetId: string,
  fromArea: string,
  fromIndex: number,
  toArea: string,
  toIndex: number
): LayoutMap {
  const next: LayoutMap = {};
  for (const a of DASHBOARD_AREAS) next[a] = [...(map[a] ?? [])];
  const from = next[fromArea];
  const i = Math.min(Math.max(fromIndex, 0), from.length - 1);
  const [removed] = from.splice(i, 1);
  if (!removed) return map;
  const to = next[toArea];
  to.splice(Math.min(Math.max(toIndex, 0), to.length), 0, removed);
  return next;
}

/** Kolom area: droppable (drop di bawah list / kolom kosong, priority Low). */
function AreaColumn({
  area,
  dragging,
  isPreview,
  children,
}: {
  area: string;
  dragging: boolean;
  isPreview: boolean;
  children: React.ReactNode;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: area,
    type: "column",
    accept: "item",
    collisionPriority: CollisionPriority.Low,
  });

  return (
    <div className="flex flex-col">
      <p className="px-1 pb-1.5 text-xs font-medium uppercase tracking-wide text-text-tertiary">
        {AREA_LABELS[area] ?? area}
      </p>
      <div
        ref={ref}
        data-dashboard-area={area}
        className={cn(
          "flex min-h-12 flex-col gap-4 rounded-xl border-2 border-transparent p-1 transition-colors",
          // Saat drag aktif, SEMUA area terlihat sebagai dropzone (pola legacy:
          // placeholder dashed muncul di tiap [data-container] saat sortable start).
          dragging && "border-dashed border-card-border",
          isDropTarget && "border-solid border-primary-300 bg-primary-50/50"
        )}
      >
        {isPreview ? (
          <div className="flex min-h-32 flex-1 items-center justify-center rounded-xl border-2 border-dashed border-card-border px-4 py-6 text-center text-xs text-text-tertiary">
            Area kosong — widget yang disembunyikan / dipindah bisa ditaruh di sini
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function DashboardGrid() {
  const qc = useQueryClient();
  const { data: dash } = useDashboardState();
  const { data: ext } = useModuleExtensions();
  const saveLayout = useSaveDashboardLayout();
  const saveVisibility = useSaveDashboardVisibility();
  const resetDashboard = useResetDashboard();

  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dragLabel, setDragLabel] = useState<string | null>(null);

  const widgets = ext?.widgets ?? [];
  const visibility = dash?.visibility ?? null;
  const resolved = resolveDashboardLayout(dash?.layout ?? null, widgets);

  if (!ext) return null; // masih loading extensions / belum login

  function onDragStart(event: DragStartEvent) {
    setDragging(true);
    const id = event.operation.source?.id;
    const w = widgets.find((x) => x.id === id);
    setDragLabel(w?.title ?? String(id));
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(false);
    setDragLabel(null);
    if (event.canceled) return;

    const { source, target } = event.operation;
    if (!source || !isSortable(source)) return;

    const cur = idsByArea(dash?.layout, widgets);
    const { initialIndex, index, initialGroup, group } = source;

    let next: LayoutMap | null = null;

    if (target && isSortable(target)) {
      // Drop di atas item sortable lain: plugin OptimisticSorting sudah
      // meng-update index/group source ke posisi final.
      if (initialGroup == null || group == null) return;
      if (initialGroup === group) {
        const arr = cur[String(group)] ?? [];
        if (initialIndex !== index && arr.length > 1) {
          next = moveItem(
            cur,
            String(source.id),
            String(group),
            initialIndex,
            String(group),
            index
          );
        }
      } else {
        next = moveItem(
          cur,
          String(source.id),
          String(initialGroup),
          initialIndex,
          String(group),
          index
        );
      }
    } else if (target && target.type === "column") {
      // Drop di kolom kosong / di bawah list -> taruh di akhir kolom target.
      const fromArea = initialGroup != null ? String(initialGroup) : null;
      const toArea = String(target.id);
      if (!fromArea) return;
      const toIndex =
        fromArea === toArea ? (cur[toArea]?.length ?? 0) - 1 : cur[toArea]?.length ?? 0;
      next = moveItem(cur, String(source.id), fromArea, initialIndex, toArea, toIndex);
    }

    if (next) {
      saveLayout.mutateAsync(next).catch((e: Error) => {
        toast.error(e.message ?? "Gagal menyimpan layout");
      });
    }
  }


  function toggleVisibility(widgetId: string) {
    const vis = visibility ?? {};
    const next = { ...vis, [widgetId]: vis[widgetId] === false };
    saveVisibility
      .mutateAsync(next)
      .catch((e: Error) => toast.error(e.message ?? "Gagal menyimpan visibilitas"));
  }

  function handleReset() {
    if (!window.confirm("Kembalikan tata letak dashboard ke default?")) return;
    resetDashboard
      .mutateAsync()
      .catch((e: Error) => toast.error(e.message ?? "Gagal reset dashboard"));
  }

  return (
    <div className="space-y-6">
      {/* Toolbar dashboard — padanan screen-options legacy */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-card-border bg-card-background px-4 py-3">
        <p className="text-sm text-text-secondary">
          Seret widget lewat grip <span className="mx-0.5">⋮⋮</span> untuk
          memindahkan antar area.
        </p>
        <div className="ml-auto flex items-center gap-2">
          {/* Panel visibilitas widget — padanan screen-options legacy (checkbox
              per widget, tetap bisa diakses saat widgetnya tersembunyi). */}
          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-lg border border-card-border bg-card-background px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover [&::-webkit-details-marker]:hidden">
              Widgets
              <span className="ml-1.5 text-text-tertiary">
                ({widgets.filter((w) => isWidgetVisible(w.id, visibility)).length}/{widgets.length})
              </span>
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-card-border bg-card-background p-3 shadow-lg">
              <ul className="space-y-1.5">
                {widgets.map((w) => {
                  const visible = isWidgetVisible(w.id, visibility);
                  return (
                    <li key={w.id}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
                        <input
                          type="checkbox"
                          checked={visible}
                          data-widget-toggle={w.id}
                          onChange={() => toggleVisibility(w.id)}
                          className="size-3.5 accent-primary-600"
                        />
                        <span className="truncate">{w.title}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </details>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              preview
                ? "border-primary-300 bg-primary-50 text-primary-700"
                : "border-card-border bg-card-background text-text-secondary hover:bg-card-hover"
            )}
          >
            {preview ? "Sembunyikan area widget" : "Lihat area widget"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-card-border bg-card-background px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover"
          >
            Reset dashboard
          </button>
        </div>
      </div>

      <DragDropProvider onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-12 gap-4">
          {DASHBOARD_AREAS.map((area) => {
            const items = resolved[area];
            return (
              <section
                key={area}
                className={cn(
                  "col-span-12",
                  area === "top-12" && "lg:col-span-12",
                  area === "left-8" && "lg:col-span-8",
                  area === "right-4" && "lg:col-span-4"
                )}
              >
                <AreaColumn area={area} dragging={dragging} isPreview={preview}>
                  {items.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-text-tertiary">
                      Belum ada widget di area ini
                    </p>
                  ) : (
                    items.map((w, index) => (
                      <DashboardWidgetCard
                        key={w.id}
                        widget={w}
                        index={index}
                        area={area}
                        visible={isWidgetVisible(w.id, visibility)}
                        onToggleVisibility={toggleVisibility}
                      />
                    ))
                  )}
                </AreaColumn>
              </section>
            );
          })}
        </div>
        {dragLabel && (
          <DragOverlay>
            <div className="rounded-xl border border-card-border bg-card-background px-4 py-3 text-sm font-semibold text-text-primary shadow-lg">
              {dragLabel}
            </div>
          </DragOverlay>
        )}
      </DragDropProvider>
    </div>
  );
}
