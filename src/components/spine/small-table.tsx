"use client";

import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import { cn } from "@/utils/cn";
import { SearchIcon } from "@/components/common/header/icons";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/tailgrids/core/input-group";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";
import { Button } from "@/components/tailgrids/core/button";
import { TabContent } from "./tab-content";
import type { DetailTab } from "@/services/spine/module-extensions";

/**
 * SmallTable — list + panel detail bertab (padanan nextjs-spine SmallTable,
 * diimplementasi ulang dengan TanStack Table + primitives/tokens NextAdmin).
 *
 * POLA: visibility panel detail dikontrol oleh PROP `showDetail` dari parent,
 * bukan state internal. Klik row di parent handler harus `setShowDetail(true)`
 * agar auto-expand. Tombol toggle ◀/▶ juga ada di parent (di toolbar prop atau
 * samping SmallTable), bukan di dalam SmallTable.
 *
 * SEMANTIC CLASS NAMES (bahasa diskusi UI):
 *   small-table / small-table-list / small-table-detail
 *   small-table-search / small-table-list-row / small-table-list-row--selected
 *   small-table-list-col / small-table-list-col--primary
 *   small-table-detail-header / small-table-tabs / small-table-tab
 *   small-table-tab--active / small-table-detail-body / small-table-toolbar
 *   small-table-pagination
 */
export interface SmallTableColumn<T> {
  key: string;
  label: string;
  /** Kolom utama — tetap tampil saat mode kecil (kolom non-primary hidden). */
  primary?: boolean;
  render: (item: T) => React.ReactNode;
}

export interface SmallTableProps<T> {
  items: T[];
  tabs: DetailTab[];
  columns: SmallTableColumn<T>[];
  selectedId: number | string | null;
  onSelectId: (id: number | string) => void;
  getItemId: (item: T) => number | string;
  /** URL untuk tab konten (default: ganti {id} dengan id row). */
  getTabUrl?: (item: T, tab: DetailTab) => string;
  getItemTitle?: (item: T) => string;
  /** Tombol aksi di header detail panel (Edit, Delete, dll). */
  toolbar?: (item: T) => React.ReactNode;
  /** Kontrol visibilitas panel detail dari parent — KUNCI POLA. */
  showDetail?: boolean;
  refreshKey?: number;
  tabHideKeys?: string[];
  tabCustomValue?: Record<
    string,
    (value: unknown, row: Record<string, unknown>) => React.ReactNode
  >;
  renderHeader?: (item: T) => React.ReactNode;
  searchableKeys?: string[];
  getSearchText?: (item: T) => string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  perPage?: number;
  emptyText?: string;
  tabEmptyText?: string;
}

export function SmallTable<T>({
  items,
  tabs,
  columns,
  selectedId,
  onSelectId,
  getItemId,
  getTabUrl = (item, tab) => tab.api.replace("{id}", String(getItemId(item))),
  getItemTitle = (item) =>
    String((item as { name?: unknown }).name ?? getItemId(item)),
  toolbar,
  showDetail = true,
  refreshKey = 0,
  tabHideKeys = [],
  tabCustomValue,
  renderHeader,
  searchableKeys = [],
  getSearchText,
  searchValue,
  onSearchChange,
  perPage = 10,
  emptyText = "Tidak ada item.",
  tabEmptyText = "Tidak ada data.",
}: SmallTableProps<T>) {
  const sortedTabs = useMemo(
    () => [...tabs].sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
    [tabs]
  );
  const [activeTab, setActiveTab] = useState<string>(sortedTabs[0]?.slug ?? "");
  const tab = sortedTabs.find((t) => t.slug === activeTab) ?? sortedTabs[0] ?? null;
  // Overview = data record SUDAH ada di client — render tanpa fetch.
  const isOverviewTab = tab?.slug === "overview";

  // Search client-side (title + parent name via getSearchText).
  const [internalSearch, setInternalSearch] = useState("");
  const q = (searchValue ?? internalSearch).trim().toLowerCase();
  const setQ = onSearchChange ?? setInternalSearch;

  const filteredItems = useMemo(() => {
    if (!q) return items;
    return items.filter((it) => {
      if (getSearchText) {
        return getSearchText(it).toLowerCase().includes(q);
      }
      return searchableKeys.some((key) =>
        String((it as Record<string, unknown>)[key] ?? "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [items, q, getSearchText, searchableKeys]);

  // Kolom yang tampil: mode kecil = hanya primary (padanan hidden_columns legacy).
  // WAJIB useMemo: filter() tanpa memo = array baru tiap render -> colDefs baru
  // tiap render -> TanStack rebuild kolom tiap render (freeze saat ketik).
  const selected = filteredItems.find((it) => getItemId(it) === selectedId) ?? null;
  const smallMode = selected !== null && showDetail;

  const visibleCols = useMemo(() => {
    if (smallMode && columns.some((c) => c.primary)) {
      return columns.filter((c) => c.primary);
    }
    return columns;
  }, [columns, smallMode]);

  const colDefs = useMemo<ColumnDef<T>[]>(
    () =>
      visibleCols.map((c) => ({
        id: c.key,
        header: c.label,
        cell: ({ row }) => c.render(row.original),
      })),
    [visibleCols]
  );

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: perPage,
  });

  const table = useReactTable({
    data: filteredItems,
    columns: colDefs,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => String(getItemId(row)),
    // autoResetPageIndex OFF: dengan pagination controlled, reset otomatis tiap
    // data berubah = ping-pong onPaginationChange -> render -> reset (freeze saat
    // ketik search). Reset manual via clamp pageIndex di bawah.
    autoResetPageIndex: false,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  // Reset ke halaman 1 saat search berubah — hanya kalau memang bukan halaman 1
  // (hindari objek state baru tiap ketik -> re-render tak perlu).
  useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
  }, [q]);

  // Sync pageSize kalau setting tables_pagination_limit berubah setelah mount.
  useEffect(() => {
    setPagination((p) =>
      p.pageSize === perPage ? p : { ...p, pageSize: perPage }
    );
  }, [perPage]);

  // Clamp pageIndex kalau data menyusut (search) sampai di bawah halaman aktif.
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / perPage));
    setPagination((p) =>
      p.pageIndex >= totalPages
        ? { ...p, pageIndex: totalPages - 1 }
        : p
    );
  }, [filteredItems.length, perPage]);

  // Panel detail muncul hanya saat selected record TIDAK null DAN parent
  // mengizinkan (showDetail=true). Visibility dikontrol sepenuhnya oleh parent.
  const showDetailPanel = selected !== null && showDetail;

  return (
    <div className="small-table flex flex-col gap-4 lg:flex-row">
      {/* Kolom kiri: tabel */}
      <div
        className={cn(
          "small-table-list min-w-0",
          smallMode ? "lg:w-5/12" : "lg:w-full"
        )}
      >
        {(getSearchText || searchableKeys.length > 0) && (
          <InputGroup className="small-table-search mb-3 h-9">
            <InputGroupAddon align="inline-start" className="pr-0 text-icon-tertiary">
              <SearchIcon className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Cari..."
              value={searchValue ?? internalSearch}
              onChange={(e) => setQ(e.target.value)}
              className="pl-2 text-sm"
            />
          </InputGroup>
        )}

        <div className="overflow-hidden rounded-xl border border-card-border bg-card-background">
          <TableRoot className="w-full rounded-none border-none">
            <TableHeader>
              <TableRow className="[&_th]:border-t">
                {visibleCols.map((c) => (
                  <TableHead
                    key={c.key}
                    className="px-4 py-2.5 text-xs font-semibold text-text-secondary"
                  >
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow className="[&_td]:border-none">
                  <TableCell
                    colSpan={visibleCols.length}
                    className="px-4 py-6 text-center text-sm text-text-tertiary"
                  >
                    {emptyText}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const active = row.id === String(selectedId);
                  return (
                    <TableRow
                      key={row.id}
                      onClick={() => onSelectId(getItemId(row.original))}
                      className={cn(
                        "small-table-list-row cursor-pointer transition-colors [&_td]:border-none",
                        active
                          ? "small-table-list-row--selected bg-card-surface-area"
                          : "hover:bg-card-surface-area"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "small-table-list-col px-4 py-3 text-sm",
                            columns.find((c) => c.key === cell.column.id)?.primary
                              ? "small-table-list-col--primary font-medium text-text-primary"
                              : "text-text-secondary"
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </TableRoot>

          {filteredItems.length > perPage && (
            <div className="small-table-pagination flex items-center justify-between border-t border-border-primary px-4 py-2.5 text-xs text-text-secondary">
              <span>
                {filteredItems.length === 0
                  ? "0"
                  : `${pagination.pageIndex * perPage + 1}-${Math.min(
                      (pagination.pageIndex + 1) * perPage,
                      filteredItems.length
                    )}`}{" "}
                dari {filteredItems.length}
              </span>
              <div className="flex gap-1">
                <Button
                  appearance="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => table.previousPage()}
                  isDisabled={!table.getCanPreviousPage()}
                >
                  ‹ Prev
                </Button>
                <Button
                  appearance="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => table.nextPage()}
                  isDisabled={!table.getCanNextPage()}
                >
                  Next ›
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kolom kanan: panel detail — dikontrol sepenuhnya oleh showDetail prop + selected */}
      {showDetailPanel && (
        <div className="small-table-detail min-w-0 flex-1 lg:w-7/12">
          <div className="overflow-hidden rounded-xl border border-card-border bg-card-background">
            <div className="small-table-detail-header flex flex-wrap items-center justify-between gap-2 border-b border-border-primary px-5 py-4">
              <h2 className="text-sm font-semibold text-text-primary">
                {renderHeader ? (
                  renderHeader(selected)
                ) : (
                  <>
                    #{String(getItemId(selected))} {getItemTitle(selected)}
                  </>
                )}
              </h2>
              {toolbar && (
                <div className="small-table-toolbar flex items-center gap-2">
                  {toolbar(selected)}
                </div>
              )}
            </div>

            {sortedTabs.length > 0 && (
              <nav className="small-table-tabs flex flex-wrap gap-1 border-b border-border-primary px-3 py-2">
                {sortedTabs.map((t) => {
                  const isActive = t.slug === activeTab;
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => setActiveTab(t.slug)}
                      className={cn(
                        "small-table-tab flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                        isActive
                          ? "small-table-tab--active bg-badge-primary-background font-medium text-badge-primary-text"
                          : "text-text-secondary hover:bg-card-surface-area hover:text-text-primary"
                      )}
                    >
                      {t.icon && <span className="text-xs">{t.icon}</span>}
                      {t.label}
                    </button>
                  );
                })}
              </nav>
            )}

            <div className="small-table-detail-body p-5">
              {tab ? (
                <TabContent
                  url={getTabUrl(selected, tab)}
                  emptyText={tabEmptyText}
                  refreshKey={refreshKey}
                  hideKeys={tabHideKeys}
                  customValue={tabCustomValue}
                  inlineData={isOverviewTab ? selected : undefined}
                />
              ) : (
                <p className="text-sm text-text-tertiary">{tabEmptyText}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
