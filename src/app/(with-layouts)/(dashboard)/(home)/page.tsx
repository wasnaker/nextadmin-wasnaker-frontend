"use client";

import { useAuth } from "@/services/spine/auth-context";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";

/**
 * Halaman depan (butuh login — shell (with-layouts) sudah redirect ke /login).
 * Host kerangka dashboard widget: area top-12 / left-8 / right-4, DnD antar
 * area, visibility per widget — state per user via Spine /api/v1/dashboard.
 */
export default function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 px-2 lg:px-6">
      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">
          {user?.name ? `Selamat datang, ${user.name}.` : "Selamat datang."}
        </p>
      </div>

      <DashboardGrid />
    </div>
  );
}
