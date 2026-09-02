"use client";

import type { ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getToken } from "@/services/spine/api";
import type { ModuleWidget } from "@/services/spine/module-extensions";
import { StatusBadge } from "@/components/spine/status-badge";
import { CalendarWidget } from "./widgets/calendar-widget";
import { TodosWidget } from "./widgets/todos-widget";

/**
 * Registry widget DASHBOARD — infrastruktur.
 *
 * Modul bisnis (Quotations, dll) cukup: (1) daftarkan widget di manifest
 * backend-nya (muncul di extensions.widgets), (2) daftarkan komponen di sini.
 * Widget yang terdaftar backend tapi belum punya komponen -> kartu placeholder
 * (WIDGET_FALLBACK), jadi manifest boleh mendahului implementasi UI.
 */

interface WidgetListRecord {
  id: number;
  [key: string]: unknown;
}

/** Data ringkas widget: {total, rows: [{id, title, subtitle?, status?}]}. */
interface WidgetData {
  total: number;
  rows: { id: number; title: string; subtitle?: string; status?: string }[];
}

const LIST_FIELDS = ["name", "title", "subject", "label"] as const;
const SUBTITLE_FIELDS = ["status", "state", "type"] as const;

function useWidgetData(apiPath: string): {
  data: WidgetData;
  isPending: boolean;
} {
  const token = getToken();
  const { data, isPending } = useQuery({
    queryKey: ["spine", "widget", apiPath, token],
    queryFn: async () => {
      const res = await api<{ data: WidgetListRecord[] }>(apiPath);
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat widget");
      const items = res.data?.data ?? [];
      const rows = items.slice(0, 5).map((r) => {
        const title =
          (LIST_FIELDS.find((f) => typeof r[f] === "string") &&
            String(r[LIST_FIELDS.find((f) => typeof r[f] === "string")!])) ||
          `#${r.id}`;
        const sub = SUBTITLE_FIELDS.find((f) => typeof r[f] === "string");
        return {
          id: r.id,
          title,
          subtitle: sub ? String(r[sub]) : undefined,
          status: typeof r.status === "string" ? r.status : undefined,
        };
      });
      return { total: items.length, rows };
    },
    enabled: Boolean(token) && Boolean(apiPath),
  });
  return { data: data ?? { total: 0, rows: [] }, isPending };
}

function SampleItemsWidget() {
  const { data, isPending } = useWidgetData("/api/v1/sample");
  return <WidgetListBody label="items" data={data} isPending={isPending} />;
}

function SampleTasksWidget() {
  const { data, isPending } = useWidgetData("/api/v1/sample-tasks");
  return <WidgetListBody label="tasks" data={data} isPending={isPending} />;
}

function WidgetListBody({
  label,
  data,
  isPending,
}: {
  label: string;
  data: WidgetData;
  isPending: boolean;
}) {
  if (isPending) {
    return <p className="text-sm text-text-tertiary">Memuat…</p>;
  }
  if (data.total === 0) {
    return <p className="text-sm text-text-tertiary">Belum ada {label}.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-text-tertiary">
        {data.total} {label} terdaftar — 5 terbaru:
      </p>
      <ul className="divide-y divide-card-border rounded-lg border border-card-border">
        {data.rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm"
          >
            <span className="truncate text-text-primary">
              {r.title}
              {r.subtitle && r.subtitle !== r.title && (
                <span className="ml-2 text-xs text-text-tertiary">{r.subtitle}</span>
              )}
            </span>
            {r.status ? <StatusBadge status={r.status} /> : <span className="text-xs text-text-tertiary">#{r.id}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Widget terdaftar di backend tanpa komponen frontend. */
function WidgetFallback({ widget }: { widget: ModuleWidget }) {
  return (
    <p className="text-sm text-text-tertiary">
      Widget “{widget.title}” dari modul <em>{widget.module}</em> belum
      diimplementasikan di frontend — daftarkan komponennya di widget-registry.
    </p>
  );
}

const REGISTRY: Record<string, ComponentType<{ apiPath: string }>> = {
  "sample-items": SampleItemsWidget,
  "sample-tasks": SampleTasksWidget,
  calendar: CalendarWidget,
  todos: TodosWidget,
};

/** Body widget dari registry; fallback bila belum terdaftar komponennya. */
export function WidgetBody({ widget }: { widget: ModuleWidget }) {
  const Component = REGISTRY[widget.id];
  if (!Component) return <WidgetFallback widget={widget} />;
  return <Component apiPath={widget.api} />;
}
