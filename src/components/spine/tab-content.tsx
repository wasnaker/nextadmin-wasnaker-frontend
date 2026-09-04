"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { Skeleton } from "@/components/tailgrids/core/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";
import { StatusBadge } from "./status-badge";

/** Skeleton shimmer saat first-load (pengganti teks "Memuat..."). */
export function TabSkeleton() {
  return (
    <div className="space-y-3">
      {[100, 85, 70, 90].map((w, i) => (
        <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

/**
 * Konten tab generik (padanan TabContent nextjs-spine):
 *  - array  -> tabel + badge status
 *  - objek  -> vertical dl
 *  - inlineData -> render langsung tanpa fetch (tab overview)
 * Cache per URL via React Query (SWR: cache dulu, refetch background);
 * refreshKey masuk query key -> setelah edit, url dianggap baru.
 */
export function TabContent({
  url,
  emptyText,
  refreshKey = 0,
  hideKeys = [],
  customValue,
  inlineData,
}: {
  url: string;
  emptyText: string;
  refreshKey?: number;
  hideKeys?: string[];
  customValue?: Record<
    string,
    (value: unknown, row: Record<string, unknown>) => React.ReactNode
  >;
  inlineData?: unknown;
}) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["spine", "tab", url, refreshKey],
    queryFn: async () => {
      const res = await api<{ data?: unknown }>(url);
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? res.data;
    },
    enabled: inlineData === undefined,
    // Denyut fix: ganti record (key baru/cache miss) -> data query sebelumnya
    // tetap tampil sebagai placeholder selama fetch. Tidak ada fase skeleton.
    // (React Query v5: pengganti keepPreviousData v4.)
    placeholderData: (prev) => prev,
  });

  if (inlineData !== undefined) {
    return (
      <TabView data={inlineData} emptyText={emptyText} hideKeys={hideKeys} customValue={customValue} />
    );
  }
  if (isPending && !data) return <TabSkeleton />;
  if (isError) {
    return <p className="text-sm text-text-tertiary">{(error as Error)?.message ?? "Gagal memuat"}</p>;
  }
  return <TabView data={data} emptyText={emptyText} hideKeys={hideKeys} customValue={customValue} />;
}

function TabView({
  data,
  emptyText,
  hideKeys,
  customValue,
}: {
  data: unknown;
  emptyText: string;
  hideKeys: string[];
  customValue?: Record<
    string,
    (value: unknown, row: Record<string, unknown>) => React.ReactNode
  >;
}) {
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  if (rows.length === 0) return <p className="text-sm text-text-tertiary">{emptyText}</p>;

  // ARRAY -> tabel (list: tasks, activity, ...)
  if (Array.isArray(data)) {
    const objs = rows as Record<string, unknown>[];
    const keys = [...new Set(objs.flatMap((o) => Object.keys(o)))].filter(
      (k) => !hideKeys.includes(k)
    );
    return (
      <TableRoot className="rounded-lg border border-border-primary">
        <TableHeader>
          <TableRow className="[&_th]:border-t">
            {keys.map((k) => (
              <TableHead key={k} className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                {k.replace(/_/g, " ")}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {objs.map((o, i) => (
            <TableRow key={i} className="[&_td]:border-none">
              {keys.map((k) => (
                <TableCell key={k} className="px-4 py-2.5 text-sm align-top">
                  {customValue?.[k] ? (
                    customValue[k](o[k], o)
                  ) : k === "status" && typeof o[k] === "string" ? (
                    <StatusBadge status={String(o[k])} />
                  ) : o[k] === null || o[k] === "" ? (
                    <span className="text-text-tertiary">—</span>
                  ) : (
                    String(o[k])
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </TableRoot>
    );
  }

  // OBJEK TUNGGAL -> vertical dl (overview)
  return (
    <div className="divide-y divide-border-primary">
      {rows.map((r, i) => (
        <dl key={i} className="divide-y divide-border-primary">
          {Object.entries(r as Record<string, unknown>)
            .filter(([k]) => !hideKeys.includes(k))
            .map(([k, v]) => (
              <div key={k} className="flex gap-4 py-2.5">
                <dt className="w-36 shrink-0 text-xs uppercase tracking-wider text-text-tertiary">
                  {k.replace(/_/g, " ")}
                </dt>
                <dd className="text-sm text-text-primary">
                  {customValue?.[k] ? (
                    customValue[k](v, r as Record<string, unknown>)
                  ) : v === null || v === "" ? (
                    <span className="text-text-tertiary">—</span>
                  ) : (
                    String(v)
                  )}
                </dd>
              </div>
            ))}
        </dl>
      ))}
    </div>
  );
}
