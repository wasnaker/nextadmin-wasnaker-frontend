"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { Button } from "@/components/tailgrids/core/button";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { useState } from "react";

/**
 * Notifikasi — halaman penuh (dari bell dropdown View All).
 * GET /api/v1/notifications (scope pribadi).
 */

interface NotificationData {
  id: string;
  type: string;
  data: {
    title: string;
    body: string;
    module?: string;
    url?: string;
    data?: Record<string, unknown>;
  };
  read_at: string | null;
  created_at: string;
}

interface NotificationsResponse {
  data: NotificationData[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    unread_count: number;
  };
}

function formatTime(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationBody({ notification }: { notification: NotificationData }) {
  return (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-secondary bg-background-gray-primary text-xs font-semibold text-icon-secondary uppercase group-hover:bg-brand-500 group-hover:text-base-white">
        {(notification.data.module ?? "i").slice(0, 1)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm leading-5 font-semibold text-text-primary">
            {notification.data.title}
          </p>
          {!notification.read_at && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
          )}
        </div>
        <p className="mt-1 text-xs leading-4 text-text-secondary">
          {notification.data.body}
        </p>
        <p className="mt-1 text-xs leading-4 text-text-tertiary">
          {formatTime(notification.created_at)}
        </p>
      </div>
    </>
  );
}

export default function NotificationPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isPending } = useQuery({
    queryKey: ["spine", "notifications", "page", page],
    queryFn: async () => {
      const res = await api<NotificationsResponse>(
        `/api/v1/notifications?per_page=25&page=${page}`
      );
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat notifikasi");
      return res.data;
    },
  });

  const items = data?.data ?? [];

  const markAsRead = async (id: string) => {
    await api(`/api/v1/notifications/${id}/read`, { method: "POST" });
    qc.invalidateQueries({ queryKey: ["spine", "notifications"] });
  };

  const markAllAsRead = async () => {
    await api("/api/v1/notifications/read-all", { method: "POST" });
    qc.invalidateQueries({ queryKey: ["spine", "notifications"] });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl leading-7 font-semibold text-text-primary">Notification</h2>
        <Button variant="primary" size="sm" className="bg-brand-500 py-1.5" onPress={markAllAsRead}>
          Mark all as read
        </Button>
      </div>

      {isPending ? (
        <p className="text-sm text-text-tertiary">Memuat...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-tertiary">Tidak ada notifikasi</p>
      ) : (
        <ul className="divide-y divide-border-secondary-alt">
          {items.map((notification) => (
            <li key={notification.id}>
              {notification.data.url ? (
                <Link
                  href={notification.data.url}
                  className="group flex w-full cursor-pointer gap-3.5 rounded-lg px-3 py-4 text-start transition-colors duration-300 hover:bg-background-gray-secondary_alt"
                  onClick={() => markAsRead(notification.id)}
                >
                  <NotificationBody notification={notification} />
                </Link>
              ) : (
                <button
                  className="group flex w-full cursor-pointer gap-3.5 rounded-lg px-3 py-4 text-start transition-colors duration-300 hover:bg-background-gray-secondary_alt"
                  onClick={() => markAsRead(notification.id)}
                >
                  <NotificationBody notification={notification} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {data && data.meta.last_page > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            isDisabled={page <= 1}
            onPress={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <span className="text-xs text-text-tertiary">
            Page {data.meta.current_page} of {data.meta.last_page} ({data.meta.total} total,{" "}
            {data.meta.unread_count} unread)
          </span>
          <Button
            variant="ghost"
            size="sm"
            isDisabled={page >= data.meta.last_page}
            onPress={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
