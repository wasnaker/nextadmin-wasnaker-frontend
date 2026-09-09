"use client";

import { useMemo, useState } from "react";
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
  Select,
  SelectContent,
  SelectHeader,
  SelectIndicator,
  SelectItem,
  SelectSection,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";
import { usePaginationLimit } from "@/services/spine/use-pagination-limit";
import { useModuleExtensions } from "@/services/spine/module-extensions";

interface CustomerEquipment {
  id: number;
  ulid?: string;
  unit_code: string;
  unit_name: string;
  equipment_id?: number | null;
  customer_id: number;
  serial_no?: string | null;
  location?: string | null;
  procurement_year?: number | null;
  manufacture_year?: number | null;
  cert_expired?: string | null;
  status: string;
  customer?: { id: number; code: string; name: string } | null;
  equipment?: { id: number; code: string; name: string } | null;
}

interface Equipment {
  id: number;
  code: string;
  name: string;
  subgroup?: { id: number; name: string } | null;
}

interface Customer {
  id: number;
  code: string;
  name: string;
  type: string;
}

const EMPTY_FORM = {
  unit_name: "",
  equipment_id: "",
  customer_id: "",
  serial_no: "",
  location: "",
  procurement_year: "",
  manufacture_year: "",
  cert_expired: "",
  status: "active",
};

/** My Equipment — equipment milik customer (pola ~/My Equipment.csv). */
export default function MyEquipmentPage() {
  const { token, user: me } = useAuth();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerEquipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [smallView, setSmallView] = useState(true);
  const [selectedRowIds, setSelectedRowIds] = useState<Array<number | string>>(
    []
  );

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const h = Number(window.location.hash.replace("#", ""));
    return h || null;
  });

  const canView = can(me, "customer-equipment:view");
  const canManage = can(me, "customer-equipment:create") || can(me, "customer-equipment:edit");
  const isCustomerEntity = (me?.access?.roles ?? []).includes("customer");

  const { data: items = [], isPending } = useQuery({
    queryKey: ["spine", "customer-equipments", token],
    queryFn: async () => {
      const res = await api<{ data: CustomerEquipment[] }>(
        "/api/v1/customer-equipments"
      );
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: equipments = [] } = useQuery({
    queryKey: ["spine", "equipments", token],
    queryFn: async () => {
      const res = await api<{ data: Equipment[] }>("/api/v1/equipments");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["spine", "customers", token],
    queryFn: async () => {
      const res = await api<{ data: Customer[] }>("/api/v1/customers");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });
  const hoCustomers = useMemo(
    () => customers.filter((c) => c.type === "customer"),
    [customers]
  );
  // Group by subgroup: setiap item pasti punya subgroup (category opsional).
  const equipmentGroups = useMemo(() => {
    const map = new Map<string, { name: string; items: Equipment[] }>();
    for (const e of equipments) {
      const key = String(e.subgroup?.id ?? 0);
      const name = e.subgroup?.name ?? "Lainnya";
      if (!map.has(key)) map.set(key, { name, items: [] });
      map.get(key)!.items.push(e);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [equipments]);

  const { data: ext } = useModuleExtensions();
  const tabs = useMemo(
    () =>
      (ext?.detail_tabs["equipment"] ?? [])
        .filter((t) => t.api.includes("/api/v1/customer-equipments/"))
        .sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
    [ext]
  );

  const columns: SmallTableColumn<CustomerEquipment>[] = [
    {
      key: "unit_code",
      label: "Unit Code",
      primary: true,
      render: (it) => (
        <span className="font-mono text-sm text-text-primary">{it.unit_code}</span>
      ),
    },
    {
      key: "unit_name",
      label: "Unit Name",
      primary: true,
      render: (it) => <span className="text-text-secondary">{it.unit_name}</span>,
    },
    {
      key: "equipment",
      label: "Equipment Type",
      render: (it) =>
        it.equipment ? (
          <span className="text-text-secondary">{it.equipment.name}</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
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
      key: "serial_no",
      label: "Serial No",
      render: (it) =>
        it.serial_no ? (
          <span className="font-mono text-sm text-text-secondary">
            {it.serial_no}
          </span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: "location",
      label: "Location",
      render: (it) =>
        it.location ? (
          <span className="text-text-secondary">{it.location}</span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: "cert_expired",
      label: "Cert Expired",
      render: (it) =>
        it.cert_expired ? (
          <span className="font-mono text-sm text-text-secondary">
            {it.cert_expired}
          </span>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (it) => <StatusBadge status={it.status} />,
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
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(item: CustomerEquipment) {
    setEditing(item);
    setForm({
      unit_name: item.unit_name,
      equipment_id: item.equipment_id ? String(item.equipment_id) : "",
      customer_id: String(item.customer_id ?? ""),
      serial_no: item.serial_no ?? "",
      location: item.location ?? "",
      procurement_year: item.procurement_year ? String(item.procurement_year) : "",
      manufacture_year: item.manufacture_year ? String(item.manufacture_year) : "",
      cert_expired: item.cert_expired ?? "",
      status: item.status,
    });
    setError(null);
    setOpen(true);
  }

  async function onSave() {
    if (!form.unit_name.trim() || !form.equipment_id) {
      setError(
        isCustomerEntity
          ? "Unit Name dan Equipment Type wajib diisi"
          : "Unit Name, Equipment Type dan Customer wajib diisi"
      );
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
        unit_name: form.unit_name.trim(),
        equipment_id: Number(form.equipment_id),
        serial_no: form.serial_no.trim() || null,
        location: form.location.trim() || null,
        procurement_year: form.procurement_year
          ? Number(form.procurement_year)
          : null,
        manufacture_year: form.manufacture_year
          ? Number(form.manufacture_year)
          : null,
        cert_expired: form.cert_expired || null,
        status: form.status,
      };
      // Customer entity: customer_id ditentukan backend dari akun login.
      if (!isCustomerEntity) {
        payload.customer_id = Number(form.customer_id);
      }
      const res = await api(
        editing
          ? `/api/v1/customer-equipments/${editing.id}`
          : "/api/v1/customer-equipments",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        setError(res.error ?? "Gagal menyimpan");
        return;
      }
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["spine", "customer-equipments"] });
      const savedId = (res.data as CustomerEquipment).id;
      selectItem(savedId);
      setRefreshKey((k) => k + 1);
    } catch {
      setError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: CustomerEquipment) {
    if (!window.confirm(`Hapus ${item.unit_name}?`)) return;
    const res = await api(`/api/v1/customer-equipments/${item.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(res.error ?? "Gagal menghapus");
      return;
    }
    if (selectedId === item.id) {
      setSelectedId(null);
      window.location.hash = "";
      setSmallView(false);
    }
    await qc.invalidateQueries({ queryKey: ["spine", "customer-equipments"] });
    setRefreshKey((k) => k + 1);
  }

  if (!canView) {
    return (
      <p className="text-sm text-text-tertiary">
        Anda tidak memiliki akses ke My Equipment.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            My Equipment
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Equipment milik customer (Unit Name = nama alat versi customer;
            Equipment Type = item katalog).
          </p>
        </div>
        {canManage && <Button onClick={openCreate}>Add Equipment</Button>}
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
          onSelectId={selectItem}
          getItemId={(it) => it.id}
          selectable
          selectedRowIds={selectedRowIds}
          onSelectRows={setSelectedRowIds}
          showDetail={smallView}
          refreshKey={refreshKey}
          perPage={perPage}
          getSearchText={(it) =>
            `${it.unit_code} ${it.unit_name} ${it.serial_no ?? ""} ${it.customer?.name ?? ""} ${it.equipment?.name ?? ""}`
          }
          tabHideKeys={[
            "ulid",
            "id",
            "equipment_id",
            "customer_id",
            "properties",
            "created_at",
            "updated_at",
            "deleted_at",
          ]}
          tabCustomValue={{
            equipment: (v) =>
              v && typeof v === "object" ? (
                <span className="text-text-primary">
                  {(v as { name?: string }).name ?? "—"}
                </span>
              ) : (
                "—"
              ),
            customer: (v) =>
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
              <span className="font-mono text-text-primary">{it.unit_code}</span>
              <span className="text-text-tertiary">#{it.id}</span>
            </span>
          )}
          toolbar={(item) =>
            canManage ? (
              <>
                <Button appearance="outline" onClick={() => openEdit(item)}>
                  Edit
                </Button>
                {can(me, "customer-equipment:delete") && (
                  <Button appearance="outline" onClick={() => onDelete(item)}>
                    Delete
                  </Button>
                )}
                <Button
                  appearance="outline"
                  onClick={() => setSmallView((v) => !v)}
                >
                  {smallView ? "◀" : "▶"}
                </Button>
              </>
            ) : null
          }
        />
      )}

      {open && (
        <Dialog isOpen={open} onOpenChange={setOpen}>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit Equipment #${editing.id}` : "Add Equipment"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <FieldLabel htmlFor="f-name">Unit Name</FieldLabel>
              <Input
                id="f-name"
                value={form.unit_name}
                onChange={(e) =>
                  setForm({ ...form, unit_name: e.target.value })
                }
                className="mt-1.5 w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                {isCustomerEntity ? (
                  <>
                    <FieldLabel>Customer</FieldLabel>
                    <div className="mt-1.5 rounded-lg border border-border-secondary bg-input-background px-3 py-2.5 text-sm text-text-secondary">
                      Customer dari akun login Anda
                    </div>
                  </>
                ) : (
                  <>
                    <FieldLabel>Customer *</FieldLabel>
                    <Select
                      value={form.customer_id}
                      onChange={(v) =>
                        setForm({ ...form, customer_id: String(v ?? "") })
                      }
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
                  </>
                )}
              </div>
              <div>
                <FieldLabel>Equipment Type *</FieldLabel>
                <Select
                  value={form.equipment_id}
                  onChange={(v) =>
                    setForm({ ...form, equipment_id: String(v ?? "") })
                  }
                  className="mt-1.5 w-full"
                  aria-label="Equipment Type"
                  >
                  <SelectTrigger className="w-full border-border-secondary bg-input-background py-2.5">
                    <SelectValue />
                    <SelectIndicator />
                  </SelectTrigger>
                  <SelectContent className="min-w-(--trigger-width)">
                    {equipmentGroups.map((g) => (
                      <SelectSection key={g.name} id={g.name}>
                        <SelectHeader>{g.name}</SelectHeader>
                        {g.items.map((e) => (
                          <SelectItem key={e.id} id={String(e.id)} textValue={e.name}>
                            {e.code} — {e.name}
                          </SelectItem>
                        ))}
                      </SelectSection>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel htmlFor="f-serial">Serial No</FieldLabel>
                <Input
                  id="f-serial"
                  value={form.serial_no}
                  onChange={(e) =>
                    setForm({ ...form, serial_no: e.target.value })
                  }
                  className="mt-1.5 w-full font-mono"
                />
              </div>
              <div>
                <FieldLabel htmlFor="f-loc">Location</FieldLabel>
                <Input
                  id="f-loc"
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  className="mt-1.5 w-full"
                />
              </div>
              <div>
                <FieldLabel htmlFor="f-cert">Cert Expired</FieldLabel>
                <Input
                  id="f-cert"
                  type="date"
                  value={form.cert_expired}
                  onChange={(e) =>
                    setForm({ ...form, cert_expired: e.target.value })
                  }
                  className="mt-1.5 w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel htmlFor="f-proc">Procurement Year</FieldLabel>
                <Input
                  id="f-proc"
                  type="number"
                  value={form.procurement_year}
                  onChange={(e) =>
                    setForm({ ...form, procurement_year: e.target.value })
                  }
                  className="mt-1.5 w-full"
                />
              </div>
              <div>
                <FieldLabel htmlFor="f-manuf">Manufacture Year</FieldLabel>
                <Input
                  id="f-manuf"
                  type="number"
                  value={form.manufacture_year}
                  onChange={(e) =>
                    setForm({ ...form, manufacture_year: e.target.value })
                  }
                  className="mt-1.5 w-full"
                />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={form.status}
                  onChange={(v) =>
                    setForm({ ...form, status: String(v ?? "active") })
                  }
                  className="mt-1.5 w-full"
                  aria-label="Status"
                >
                  <SelectTrigger className="w-full border-border-secondary bg-input-background py-2.5">
                    <SelectValue />
                    <SelectIndicator />
                  </SelectTrigger>
                  <SelectContent className="min-w-(--trigger-width)">
                    {["active", "inactive"].map((s) => (
                      <SelectItem key={s} id={s} textValue={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <Button onClick={onSave} isDisabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
