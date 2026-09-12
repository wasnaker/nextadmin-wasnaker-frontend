"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { BellIcon, SettingIcon } from "@/components/common/header/icons";
import { Button } from "@/components/tailgrids/core/button";
import { OverlayWrapper } from "@/components/tailgrids/core/overlay";
import { Popover } from "@/components/tailgrids/core/popover";
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/tailgrids/core/scroll-area";
import { cn } from "@/utils/cn";
import Link from "next/link";
import React, { useState } from "react";
import { Button as RACButton, Header, Heading } from "react-aria-components";

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
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationBody({ notification }: { notification: NotificationData }) {
  return (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-secondary bg-background-gray-primary text-xs font-semibold text-icon-secondary uppercase transition-all duration-300 group-hover:bg-brand-500 group-hover:text-base-white">
        {(notification.data.module ?? "i").slice(0, 1)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm leading-5 font-semibold text-text-primary">
            {notification.data.title}
          </p>
          {!notification.read_at && (
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-4 text-text-secondary">
          {notification.data.body}
        </p>
        <p className="mt-2 text-xs leading-4 text-text-tertiary">
          {formatTime(notification.created_at)}
        </p>
      </div>
    </>
  );
}

export function NotificationsButton() {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const { data, isPending } = useQuery({
    queryKey: ["spine", "notifications"],
    queryFn: async () => {
      const res = await api<NotificationsResponse>("/api/v1/notifications?per_page=10");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat notifikasi");
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const items = data?.data ?? [];
  const unreadCount = data?.meta.unread_count ?? 0;

  const markAsRead = async (id: string) => {
    await api(`/api/v1/notifications/${id}/read`, { method: "POST" });
    qc.invalidateQueries({ queryKey: ["spine", "notifications"] });
  };

  const markAllAsRead = async () => {
    await api("/api/v1/notifications/read-all", { method: "POST" });
    qc.invalidateQueries({ queryKey: ["spine", "notifications"] });
  };

  return (
    <OverlayWrapper isOpen={isOpen} onOpenChange={setIsOpen}>
      {/* Trigger = react-aria Button (auto-wire ke DialogTrigger; tailgrids Button = Mantine, tidak ter-wire) */}
      <RACButton
        aria-label="Notifications"
        className="relative flex size-10 items-center justify-center rounded-lg border border-card-border bg-card-background text-icon-primary shadow-xs outline-none focus-visible:border-input-primary-focus-border focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 [&>svg]:size-auto"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className={cn("absolute top-2 right-2.75 z-1 size-2 rounded-full bg-red-400")}>
            <span className="absolute inset-0 -z-1 animate-ping rounded-full bg-red-400 opacity-75" />
          </span>
        )}
      </RACButton>

      <Popover
        placement="bottom end"
        className="w-84.5 overflow-hidden rounded-2xl border border-border-secondary-alt bg-background-white-secondary p-0 shadow-3xl"
      >
        {/* Header */}
        <Header className="flex items-center justify-between border-b border-border-secondary-alt px-5 pt-5 pb-4">
          <Heading level={4} className="leading-6 font-semibold text-text-primary">
            Notifications
          </Heading>

          <Link
            className="p-1 text-icon-secondary transition-colors hover:text-icon-primary"
            href="/profile/notification"
            onClick={() => setIsOpen(false)}
          >
            <SettingIcon />
          </Link>
        </Header>

        <ScrollArea className="h-100 max-h-100">
          <ScrollAreaViewport>
            {isPending ? (
              <p className="px-5 py-6 text-sm text-text-tertiary">Memuat...</p>
            ) : items.length === 0 ? (
              <p className="px-5 py-6 text-sm text-text-tertiary">Tidak ada notifikasi</p>
            ) : (
              <ul className="flex-1 overflow-y-auto px-3 py-2">
                {items.map((notification) => (
                  <li key={notification.id}>
                    {notification.data.url ? (
                      <Link
                        href={notification.data.url}
                        className="group flex w-full cursor-pointer gap-3.5 rounded-lg px-3 py-3 text-start transition-colors duration-300 hover:bg-background-gray-secondary_alt"
                        onClick={() => {
                          setIsOpen(false);
                          markAsRead(notification.id);
                        }}
                      >
                        <NotificationBody notification={notification} />
                      </Link>
                    ) : (
                      <button
                        className="group flex w-full cursor-pointer gap-3.5 rounded-lg px-3 py-3 text-start transition-colors duration-300 hover:bg-background-gray-secondary_alt"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <NotificationBody notification={notification} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ScrollAreaViewport>
          <ScrollBar />
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-secondary-alt px-5 py-4">
          <button
            onClick={markAllAsRead}
            className="text-xs font-medium text-text-secondary underline transition-colors hover:text-text-primary"
          >
            Mark all as read
          </button>
          <Button
            variant="primary"
            size="sm"
            className="bg-brand-500 py-1.5"
            onPress={() => setIsOpen(false)}
          >
            <Link href="/profile/notification">View All</Link>
          </Button>
        </div>
      </Popover>
    </OverlayWrapper>
  );
}
