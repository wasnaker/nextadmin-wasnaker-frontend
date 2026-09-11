'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/spine/api';
import { can, useAuth } from '@/services/spine/auth-context';
import {
  SmallTable,
  type SmallTableColumn,
} from '@/components/spine/small-table';
import { StatusBadge } from '@/components/spine/status-badge';
import { Button } from '@/components/tailgrids/core/button';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/tailgrids/core/dialog';
import { FieldLabel } from '@/components/tailgrids/core/field';
import { Input } from '@/components/tailgrids/core/input';
import { usePaginationLimit } from '@/services/spine/use-pagination-limit';
import { useModuleExtensions } from '@/services/spine/module-extensions';
import { useT } from "@/services/i18n";

interface Plan {
  id: number;
  ulid?: string;
  type: string;
  name: string;
  slug: string;
  price: string | number;
  billing_cycle: string | null;
  is_active: boolean;
  created_at?: string;
}

const EMPTY_FORM = {
  type: 'customer',
  name: '',
  slug: '',
  price: '0',
  billing_cycle: '',
  is_active: true,
};

export default function PlansPage() {
  const t = useT();
  const { token, user: me } = useAuth();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [smallView, setSmallView] = useState(true);

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const h = Number(window.location.hash.replace('#', ''));
    return h || null;
  });

  const canView = can(me, 'membership:plan_view');
  const canCreate = can(me, 'membership:plan_manage');
  const canEdit = can(me, 'membership:plan_manage');
  const canDelete = can(me, 'membership:plan_manage');

  const { data: items = [], isPending } = useQuery({
    queryKey: ['spine', 'plans', token],
    queryFn: async () => {
      const res = await api<{ data: Plan[] }>('/api/v1/plans?per_page=100');
      if (!res.ok) throw new Error(res.error ?? 'Gagal memuat');
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: ext } = useModuleExtensions();
  const tabs = useMemo(
    () =>
      (ext?.detail_tabs['membership'] ?? []).sort(
        (a, b) => (a.position ?? 999) - (b.position ?? 999),
      ),
    [ext],
  );

  const columns: SmallTableColumn<Plan>[] = [
    {
      key: 'id',
      label: 'ID',
      primary: true,
      render: (it) => <span className='text-text-tertiary'>#{it.id}</span>,
    },
    {
      key: 'type',
      label: 'Tipe',
      primary: true,
      render: (it) => (
        <span className='uppercase text-text-secondary'>{it.type}</span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      primary: true,
      render: (it) => (
        <span className='font-medium text-text-primary'>{it.name}</span>
      ),
    },
    {
      key: 'slug',
      label: 'Slug',
      render: (it) => (
        <span className='font-mono text-xs text-text-secondary'>{it.slug}</span>
      ),
    },
    {
      key: 'price',
      label: 'Harga',
      render: (it) => (
        <span className='font-mono text-sm text-text-primary'>
          {Number(it.price).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (it) => (
        <StatusBadge status={it.is_active ? 'active' : 'inactive'} />
      ),
    },
  ];

  const detailCustom = {
    is_active: (v: unknown) => (
      <StatusBadge status={v ? 'active' : 'inactive'} />
    ),
    price: (v: unknown) => (
      <span className='font-mono text-text-primary'>
        {Number(v ?? 0).toLocaleString('id-ID')}
      </span>
    ),
    billing_cycle: (v: unknown) =>
      v ? (
        <span className='text-text-secondary'>{String(v)}</span>
      ) : (
        <span className='text-text-tertiary'>—</span>
      ),
  };

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

  function openEdit(item: Plan) {
    setEditing(item);
    setForm({
      type: item.type,
      name: item.name,
      slug: item.slug,
      price: String(item.price),
      billing_cycle: item.billing_cycle ?? '',
      is_active: item.is_active,
    });
    setError(null);
    setOpen(true);
  }

  async function onSave() {
    if (!form.name.trim()) {
      setError('Name wajib diisi');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        price: Number(form.price),
        billing_cycle: form.billing_cycle || null,
        is_active: form.is_active,
      };
      const res = await api(
        editing ? `/api/v1/plans/${editing.id}` : '/api/v1/plans',
        {
          method: editing ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        setError(res.error ?? 'Gagal menyimpan');
        return;
      }
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ['spine', 'plans'] });
      const savedId = (res.data as Plan).id;
      selectItem(savedId);
      setRefreshKey((k) => k + 1);
    } catch {
      setError('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: Plan) {
    if (!window.confirm(`Hapus plan ${item.name} (${item.slug})?`)) return;
    const res = await api('/api/v1/plans/' + item.id, {
      method: 'DELETE',
    });
    if (!res.ok) {
      setError(res.error ?? 'Gagal menghapus');
      return;
    }
    if (selectedId === item.id) {
      setSelectedId(null);
      window.location.hash = '';
      setSmallView(false);
    }
    await qc.invalidateQueries({ queryKey: ['spine', 'plans'] });
    setRefreshKey((k) => k + 1);
  }

  if (!canView) {
    return (
      <p className='text-sm text-text-tertiary'>
        Anda tidak memiliki akses ke manajemen plan.
      </p>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-text-primary'>
            Plans
          </h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Paket membership per tipe tenant (customer/surveyor).
          </p>
        </div>
        {canCreate && <Button onClick={openCreate}>Add Plan</Button>}
      </div>

      {error && <p className='text-sm text-text-tertiary'>{error}</p>}

      {isPending ? (
        <p className='text-sm text-text-tertiary'>{t("Loading...")}</p>
      ) : (
        <SmallTable
          items={items}
          tabs={tabs}
          columns={columns}
          selectedId={selectedId}
          onSelectId={selectItem}
          getItemId={(it) => it.id}
          showDetail={smallView}
          refreshKey={refreshKey}
          perPage={perPage}
          tabCustomValue={detailCustom}
          getSearchText={(it) =>
            `${it.type} ${it.name} ${it.slug} ${it.billing_cycle ?? ''}`
          }
          tabHideKeys={['ulid', 'id', 'created_at', 'updated_at', 'deleted_at']}
          renderHeader={(it) => (
            <span className='flex items-center gap-2'>
              <StatusBadge status={it.is_active ? 'active' : 'inactive'} />
              <span className='text-text-primary'>{it.name}</span>
              <span className='font-mono text-xs text-text-tertiary'>
                {it.slug}
              </span>
            </span>
          )}
          toolbar={(item) => (
            <>
              {canEdit && (
                <Button appearance='outline' onClick={() => openEdit(item)}>
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button appearance='outline' onClick={() => onDelete(item)}>
                  Delete
                </Button>
              )}
              <Button
                appearance='outline'
                onClick={() => setSmallView((v) => !v)}
              >
                {smallView ? '◀' : '▶'}
              </Button>
            </>
          )}
        />
      )}

      {open && (
        <Dialog isOpen={open} onOpenChange={setOpen}>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit Plan #${editing.id}` : 'Add Plan'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className='space-y-3'>
            <div>
              <FieldLabel htmlFor='f-type'>Tipe</FieldLabel>
              <Input
                id='f-type'
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder='customer / surveyor'
                className='mt-1.5 w-full'
              />
            </div>
            <div>
              <FieldLabel htmlFor='f-name'>Name</FieldLabel>
              <Input
                id='f-name'
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder='Professional'
                className='mt-1.5 w-full'
              />
            </div>
            <div>
              <FieldLabel htmlFor='f-slug'>Slug (kosong = auto dari name)</FieldLabel>
              <Input
                id='f-slug'
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder='professional'
                className='mt-1.5 w-full font-mono'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <FieldLabel htmlFor='f-price'>Harga</FieldLabel>
                <Input
                  id='f-price'
                  type='number'
                  min='0'
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className='mt-1.5 w-full'
                />
              </div>
              <div>
                <FieldLabel htmlFor='f-billing'>Billing Cycle</FieldLabel>
                <Input
                  id='f-billing'
                  value={form.billing_cycle}
                  onChange={(e) =>
                    setForm({ ...form, billing_cycle: e.target.value })
                  }
                  placeholder='monthly/yearly'
                  className='mt-1.5 w-full'
                />
              </div>
            </div>
            <div>
              <label className='flex items-center gap-2 text-sm text-text-secondary'>
                <input
                  type='checkbox'
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className='rounded border-border-primary text-icon-primary'
                />
                Aktif
              </label>
            </div>
            {error && <p className='text-sm text-text-tertiary'>{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button
              appearance='outline'
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              {t("Cancel")}
            </Button>
            <Button onClick={onSave} isDisabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
