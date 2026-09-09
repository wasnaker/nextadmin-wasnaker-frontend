"use client";

import { useEffect, useMemo, useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/tailgrids/core/dropdown";
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";
import { usePaginationLimit } from "@/services/spine/use-pagination-limit";
import { useModuleExtensions } from "@/services/spine/module-extensions";

interface Rfq {
  id: number;
  ulid?: string;
  number: number;
  prefix: string;
  formatted_number?: string | null;
  hash: string;
  date: string;
  expirydate?: string | null;
  customer_id: number;
  surveyor_id?: number | null;
  status: string;
  customer?: { id: number; code: string; name: string; type: string } | null;
  surveyor?: { id: number; code: string; name: string; type: string } | null;
  createdBy?: { id: number; name: string } | null;
}

interface CustomerEquipment {
  id: number;
  unit_code: string;
  unit_name: string;
  equipment_id?: number | null;
  customer_id: number;
  equipment?: { id: number; code: string; name: string; unit?: string | null } | null;
}

interface Customer {
  id: number;
  code: string;
  name: string;
  type: string;
}

interface Surveyor {
  id: number;
  code: string;
  name: string;
  type: string;
}

interface RfqItemDraft {
  customer_equipment_id: number;
  item_id?: number | null;
  description: string;
}

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  expirydate: "",
  customer_id: "",
  surveyor_id: "",
};

/** Mirror Rfq::TRANSITIONS backend — target status legal per status + actor. */
const TRANSITIONS: Record<string, Record<string, string>> = {
  draft: { sent: "customer" },
  sent: {
    draft: "customer",
    accepted: "surveyor",
    declined: "surveyor",
    expired: "customer",
  },
};

/** Target status yang boleh dijalankan role user ini (actor workflow). */
function allowedTargets(status: string, actor: string): string[] {
  const map = TRANSITIONS[status] ?? {};
  return Object.entries(map)
    .filter(([, a]) => a === actor)
    .map(([target]) => target);
}

/** RFQs — dokumen RFQ (customer -> surveyor). */
export default function RfqsPage() {
  const { token, user: me } = useAuth();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rfq | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedEquipIds, setSelectedEquipIds] = useState<number[]>([]);
  const [items, setItems] = useState<RfqItemDraft[]>([]);
  const [smallView, setSmallView] = useState(true);

  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Hash URL = source of truth utk panel detail: buka dari link/share,
  // route sama, back/forward — tanpa remount page (hash tidak dikirim server).
  useEffect(() => {
    const sync = () => {
      const h = Number(window.location.hash.replace("#", ""));
      setSelectedId(h || null);
      if (h) setSmallView(true);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const canView = can(me, "rfq:view") || can(me, "rfq:view_own");
  const canCreate = can(me, "rfq:create");
  const canManage = can(me, "rfq:edit") || can(me, "rfq:edit_own");
  const canDelete = can(me, "rfq:delete");
  const canMarkAs = can(me, "rfq:mark_as");
  const isCustomerEntity = (me?.access?.roles ?? []).includes("customer");
  const actorType = (me?.access?.roles ?? []).includes("surveyor")
    ? "surveyor"
    : isCustomerEntity
      ? "customer"
      : ""; // platform/non-entity = full access

  const { data: rfqs = [], isPending } = useQuery({
    queryKey: ["spine", "rfqs", token],
    queryFn: async () => {
      const res = await api<{ data: Rfq[] }>("/api/v1/rfqs");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  // Equipment milik customer (backend auto-scope ke customer sendiri utk entity).
  const { data: myEquipment = [] } = useQuery({
    queryKey: ["spine", "customer-equipments", token, form.customer_id],
    queryFn: async () => {
      const qs = isCustomerEntity ? "" : `?customer_id=${form.customer_id}`;
      const res = await api<{ data: CustomerEquipment[] }>(
        `/api/v1/customer-equipments${qs}`
      );
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView && open && (isCustomerEntity || Boolean(form.customer_id)),
  });

  // Surveyor terhubung (connections active) dgn customer — opsi utk form.
  const { data: surveyorOptions = [] } = useQuery({
    queryKey: ["spine", "rfqs", "surveyor-options", token, form.customer_id],
    queryFn: async () => {
      const qs = isCustomerEntity ? "" : `?customer_id=${form.customer_id}`;
      const res = await api<{ data: Surveyor[] }>(
        `/api/v1/rfqs/surveyor-options${qs}`
      );
      return res.data?.data ?? [];
    },
    enabled:
      Boolean(token) &&
      canView &&
      open &&
      (isCustomerEntity || Boolean(form.customer_id)),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["spine", "customers", token],
    queryFn: async () => {
      const res = await api<{ data: Customer[] }>("/api/v1/customers");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView && !isCustomerEntity,
  });
  const hoCustomers = useMemo(
    () => customers.filter((c) => c.type === "customer"),
    [customers]
  );

  const { data: ext } = useModuleExtensions();
  const tabs = useMemo(
    () =>
      (ext?.detail_tabs["rfq"] ?? [])
        .filter((t) => t.api.includes("/api/v1/rfqs/"))
        .sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
    [ext]
  );

  const columns: SmallTableColumn<Rfq>[] = [
    {
      key: "formatted_number",
      label: "Nomor",
      primary: true,
      render: (it) => (
        <span className="font-mono text-sm text-text-primary">
          {it.formatted_number ?? `#${it.id}`}
        </span>
      ),
    },
    {
      key: "surveyor",
      label: "Surveyor",
      primary: true,
      render: (it) =>
        it.surveyor ? (
          <span className="text-text-secondary">{it.surveyor.name}</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      primary: true,
      render: (it) => <StatusBadge status={it.status} />,
    },
    {
      key: "customer",
      label: "Customer",
      render: (it) =>
        it.customer ? (
          <span className="text-text-secondary">{it.customer.name}</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: "date",
      label: "Tanggal",
      render: (it) => (
        <span className="font-mono text-sm text-text-secondary">{it.date}</span>
      ),
    },
    {
      key: "expirydate",
      label: "Berlaku Hingga",
      render: (it) =>
        it.expirydate ? (
          <span className="font-mono text-sm text-text-secondary">
            {it.expirydate}
          </span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
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
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setSelectedEquipIds([]);
    setItems([]);
    setError(null);
    setOpen(true);
  }

  async function openEdit(item: Rfq) {
    setEditing(item);
    setForm({
      date: item.date,
      expirydate: item.expirydate ?? "",
      customer_id: String(item.customer_id),
      surveyor_id: item.surveyor_id ? String(item.surveyor_id) : "",
    });
    setSelectedEquipIds([]);
    setItems([]);
    setError(null);
    setOpen(true);

    const res = await api<{
      data: Rfq & { items?: RfqItemDraft[]; equipment?: { customer_equipment_id: number; item_id?: number | null }[] };
    }>(`/api/v1/rfqs/${item.id}`);
    const d = res.data as unknown as {
      items?: RfqItemDraft[];
      equipment?: { customer_equipment_id: number; item_id?: number | null }[];
    };
    const eq = d.equipment ?? [];
    const its = d.items ?? [];
    setSelectedEquipIds(eq.map((e) => e.customer_equipment_id));
    setItems(
      its.map((it) => {
        const e = eq.find((x) => x.item_id === it.item_id);
        return {
          customer_equipment_id: e?.customer_equipment_id ?? 0,
          item_id: it.item_id ?? e?.item_id ?? null,
          description: it.description,
        };
      })
    );
  }

  async function onDelete(item: Rfq) {
    if (!window.confirm(`Hapus ${item.formatted_number ?? item.id}?`)) return;
    const res = await api(`/api/v1/rfqs/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(res.error ?? "Gagal menghapus");
      return;
    }
    if (selectedId === item.id) {
      setSelectedId(null);
      window.location.hash = "";
      setSmallView(false);
    }
    await qc.invalidateQueries({ queryKey: ["spine", "rfqs"] });
    setRefreshKey((k) => k + 1);
  }

  async function onMarkAs(item: Rfq, status: string) {
    const res = await api(`/api/v1/rfqs/${item.id}/transition`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setError(res.error ?? "Gagal mengubah status");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["spine", "rfqs"] });
    setRefreshKey((k) => k + 1);
  }

  function toggleEquipment(ce: CustomerEquipment) {
    const selected = selectedEquipIds.includes(ce.id);
    setSelectedEquipIds((prev) =>
      selected ? prev.filter((x) => x !== ce.id) : [...prev, ce.id]
    );
    setItems((prev) =>
      selected
        ? prev.filter((i) => i.customer_equipment_id !== ce.id)
        : [
            ...prev,
            {
              customer_equipment_id: ce.id,
              item_id: ce.equipment_id ?? null,
              description: ce.unit_name,
            },
          ]
    );
  }

  async function onSave() {
    if (!form.date || !form.surveyor_id || !items.length) {
      setError("Tanggal, Surveyor dan minimal 1 equipment wajib diisi");
      return;
    }
    if (!isCustomerEntity && !form.customer_id) {
      setError("Customer wajib diisi");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        date: form.date,
        expirydate: form.expirydate || null,
        surveyor_id: Number(form.surveyor_id),
        equipment: items
          .filter((i) => i.customer_equipment_id > 0)
          .map((i) => ({
            customer_equipment_id: i.customer_equipment_id,
            item_id: i.item_id,
          })),
        items: items.map((i) => ({
          description: i.description,
          item_id: i.item_id,
        })),
      };
      if (!isCustomerEntity && !editing) {
        payload.customer_id = Number(form.customer_id);
      }
      const res = await api(editing ? `/api/v1/rfqs/${editing.id}` : "/api/v1/rfqs", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(res.error ?? "Gagal menyimpan");
        return;
      }
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["spine", "rfqs"] });
      selectItem((res.data as Rfq).id);
      setRefreshKey((k) => k + 1);
    } catch {
      setError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return (
      <p className="text-sm text-text-tertiary">
        Anda tidak memiliki akses ke RFQs.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            RFQs
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Request for Quotation — pilih equipment milik customer, kirim ke
            surveyor.
          </p>
        </div>
        {canCreate && <Button onClick={openCreate}>Buat RFQ</Button>}
      </div>

      {error && <p className="text-sm text-text-tertiary">{error}</p>}

      {isPending ? (
        <p className="text-sm text-text-tertiary">Memuat...</p>
      ) : (
        <SmallTable
          items={rfqs}
          tabs={tabs}
          columns={columns}
          selectedId={selectedId}
          onSelectId={selectItem}
          getItemId={(it) => it.id}
          showDetail={smallView}
          refreshKey={refreshKey}
          perPage={perPage}
          getSearchText={(it) =>
            `${it.formatted_number ?? ""} ${it.customer?.name ?? ""} ${it.surveyor?.name ?? ""} ${it.status}`
          }
          tabHideKeys={[
            "ulid",
            "id",
            "number",
            "prefix",
            "hash",
            "customer_id",
            "surveyor_id",
            "created_by",
            "requestor_id",
            "pipeline_order",
            "is_expiry_notified",
            "acceptance_firstname",
            "acceptance_lastname",
            "acceptance_email",
            "acceptance_date",
            "acceptance_ip",
            "signature",
            "short_link",
            "currency",
            "properties",
            "created_at",
            "updated_at",
            "deleted_at",
          ]}
          tabCustomValue={{
            status: (v) => <StatusBadge status={String(v ?? "")} />,
            customer: (v) =>
              v && typeof v === "object" ? (
                <span className="text-text-primary">
                  {(v as { name?: string }).name ?? "—"}
                </span>
              ) : (
                "—"
              ),
            surveyor: (v) =>
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
              <span className="font-mono text-text-primary">
                {it.formatted_number ?? `#${it.id}`}
              </span>
              <span className="text-text-tertiary">#{it.id}</span>
            </span>
          )}
          toolbar={(item) => (
            <>
              {canManage && (
                <Button appearance="outline" onClick={() => openEdit(item)}>
                  Edit
                </Button>
              )}
              {canMarkAs && Object.keys(TRANSITIONS[item.status] ?? {}).length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="rounded-lg border border-card-border px-3 py-1.5 text-sm font-medium transition outline-none focus:ring-4">
                    More
                  </DropdownMenuTrigger>
                  <DropdownMenuContent placement="bottom end">
                    {allowedTargets(item.status, actorType).map((target) => (
                      <DropdownMenuItem
                        key={target}
                        onAction={() => onMarkAs(item, target)}
                      >
                        Mark as {target}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {canDelete && (
                <Button appearance="outline" onClick={() => onDelete(item)}>
                  Delete
                </Button>
              )}
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
              {editing
                ? `Edit RFQ ${editing.formatted_number ?? editing.id}`
                : "Buat RFQ"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="f-date">Tanggal *</FieldLabel>
                <Input
                  id="f-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1.5 w-full"
                />
              </div>
              <div>
                <FieldLabel htmlFor="f-expiry">Berlaku Hingga</FieldLabel>
                <Input
                  id="f-expiry"
                  type="date"
                  value={form.expirydate}
                  onChange={(e) =>
                    setForm({ ...form, expirydate: e.target.value })
                  }
                  className="mt-1.5 w-full"
                />
              </div>
            </div>

            {isCustomerEntity || editing ? (
              <>
                <FieldLabel>Customer</FieldLabel>
                <div className="mt-1.5 rounded-lg border border-border-secondary bg-input-background px-3 py-2.5 text-sm text-text-secondary">
                  {editing
                    ? editing.customer?.name ?? "Customer tetap"
                    : "Customer dari akun login Anda"}
                </div>
              </>
            ) : (
              <div>
                <FieldLabel>Customer *</FieldLabel>
                <Select
                  value={form.customer_id}
                  onChange={(v) => {
                    setForm({ ...form, customer_id: String(v ?? ""), surveyor_id: "" });
                    setSelectedEquipIds([]);
                    setItems([]);
                  }}
                  className="mt-1.5 w-full"
                  aria-label="Customer"
                >
                  <SelectTrigger className="w-full border-border-secondary bg-input-background py-2.5">
                    <SelectValue />
                    <SelectIndicator />
                  </SelectTrigger>
                  <SelectContent className="min-w-(--trigger-width)">
                    {hoCustomers.map((c) => (
                      <SelectItem key={c.id} id={String(c.id)} textValue={c.name}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <FieldLabel>Surveyor *</FieldLabel>
              <Select
                value={form.surveyor_id}
                onChange={(v) =>
                  setForm({ ...form, surveyor_id: String(v ?? "") })
                }
                className="mt-1.5 w-full"
                aria-label="Surveyor"
              >
                <SelectTrigger className="w-full border-border-secondary bg-input-background py-2.5">
                  <SelectValue />
                  <SelectIndicator />
                </SelectTrigger>
                <SelectContent className="min-w-(--trigger-width)">
                  {surveyorOptions.length === 0 ? (
                    <SelectItem id="" textValue="Belum ada surveyor terhubung" isDisabled>
                      Belum ada surveyor terhubung
                    </SelectItem>
                  ) : (
                    surveyorOptions.map((s) => (
                      <SelectItem key={s.id} id={String(s.id)} textValue={s.name}>
                        {s.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <FieldLabel>Pilih Equipment</FieldLabel>
              <div className="mt-1.5 max-h-52 space-y-1 overflow-y-auto rounded-lg border border-border-secondary p-2">
                {myEquipment.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-text-tertiary">
                    Belum ada equipment
                  </p>
                ) : (
                  myEquipment.map((ce) => (
                    <label
                      key={ce.id}
                      className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-background-hover"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selectedEquipIds.includes(ce.id)}
                        onChange={() => toggleEquipment(ce)}
                      />
                      <span>
                        <span className="block font-medium text-text-primary">
                          {ce.unit_name}
                        </span>
                        <span className="block text-xs text-text-tertiary">
                          {ce.unit_code}
                          {ce.equipment ? ` — ${ce.equipment.name}` : ""}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {items.length > 0 && (
              <div>
                <FieldLabel>Item RFQ</FieldLabel>
                <div className="mt-1.5 overflow-x-auto rounded-lg border border-border-secondary">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-secondary text-left text-xs text-text-tertiary">
                        <th className="px-2 py-1.5 font-medium">Item</th>
                        <th className="px-2 py-1.5 font-medium">Katalog</th>
                        <th className="px-2 py-1.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr
                          key={it.customer_equipment_id}
                          className="border-b border-border-secondary last:border-0"
                        >
                          <td className="px-2 py-1.5 text-text-primary">
                            {it.description}
                          </td>
                          <td className="px-2 py-1.5 text-text-secondary">
                            {(() => {
                              const ce = myEquipment.find(
                                (x) => x.id === it.customer_equipment_id
                              );
                              return ce?.equipment?.name ?? "—";
                            })()}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <Button
                              appearance="ghost"
                              onClick={() =>
                                toggleEquipment({
                                  id: it.customer_equipment_id,
                                  unit_code: "",
                                  unit_name: it.description,
                                  equipment_id: it.item_id,
                                  customer_id: 0,
                                } as CustomerEquipment)
                              }
                            >
                              ✕
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              appearance="outline"
              onClick={() => setOpen(false)}
              isDisabled={saving}
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
