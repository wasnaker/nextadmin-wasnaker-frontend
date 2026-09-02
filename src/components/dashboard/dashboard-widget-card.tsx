"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import { Eye, EyeDisabled } from "@tailgrids/icons";
import type { ModuleWidget } from "@/services/spine/module-extensions";
import { WidgetBody } from "./widget-registry";
import { cn } from "@/utils/cn";

/** Grip ikon (drag handle) — garis 6 titik, stroke konsisten dgn ikon lain. */
function GripIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="currentColor"
    >
      <circle cx="3.5" cy="3.5" r="1.4" />
      <circle cx="10.5" cy="3.5" r="1.4" />
      <circle cx="3.5" cy="10.5" r="1.4" />
      <circle cx="10.5" cy="10.5" r="1.4" />
    </svg>
  );
}

interface Props {
  widget: ModuleWidget;
  /** Posisi dalam daftar area (SEMUA id — visible & tersembunyi). */
  index: number;
  area: string;
  visible: boolean;
  onToggleVisibility: (id: string) => void;
}

/**
 * Kartu widget = item sortable. Drag via grip di header (handleRef).
 * Widget tersembunyi tetap dirender (display:none) supaya POSISINYA di layout
 * tidak hilang — paritas legacy (widget hidden tetap dalam sortable order,
 * class 'hide' server-side).
 */
export function DashboardWidgetCard({
  widget,
  index,
  area,
  visible,
  onToggleVisibility,
}: Props) {
  const { ref, handleRef, isDragging } = useSortable({
    id: widget.id,
    index,
    group: area,
    type: "item",
    accept: "item",
  });

  return (
    <article
      ref={ref}
      data-widget-id={widget.id}
      hidden={!visible}
      className={cn(
        "rounded-xl border border-card-border bg-card-background shadow-xs",
        isDragging && "z-10 opacity-70"
      )}
    >
      <header className="flex items-center gap-2 border-b border-card-border px-4 py-2.5">
        <button
          ref={handleRef}
          type="button"
          aria-label={`Drag ${widget.title}`}
          className="cursor-grab touch-none rounded p-0.5 text-icon-tertiary hover:text-icon-secondary active:cursor-grabbing"
        >
          <GripIcon />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
          {widget.title}
        </h2>
        <button
          type="button"
          aria-label={visible ? `Sembunyikan ${widget.title}` : `Tampilkan ${widget.title}`}
          title={visible ? "Sembunyikan widget" : "Tampilkan widget"}
          onClick={() => onToggleVisibility(widget.id)}
          className="rounded p-1 text-icon-tertiary transition-colors hover:bg-card-hover hover:text-icon-secondary"
        >
          {visible ? <Eye size={16} /> : <EyeDisabled size={16} />}
        </button>
      </header>
      <div className="px-4 py-3">
        <WidgetBody widget={widget} />
      </div>
    </article>
  );
}
