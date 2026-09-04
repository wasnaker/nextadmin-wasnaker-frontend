"use client";

import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useState } from "react";
import { AuthProvider } from "@/services/spine/auth-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures the client is created once per request
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data fresh 30 detik → navigasi antar menu tidak refetch ulang
            // (tabel tidak "berdenyut" saat kembali ke halaman).
            staleTime: 30_000,
            // Saat refetch tetap terjadi, tampilkan data sebelumnya — tidak
            // drop ke skeleton (pola fix tab denyut, diterapkan global).
            placeholderData: keepPreviousData,
            // Persist ke localStorage (token juga di localStorage — tidak
            // menambah permukaan risiko) → login ulang/reload cache hangat,
            // first-load menu tidak flicker.
            gcTime: 1000 * 60 * 60 * 24, // 24 jam sebelum cache di-gc
          },
        },
      })
  );

  const [persister] = useState(() =>
    typeof window === "undefined"
      ? null
      : createSyncStoragePersister({
          storage: window.localStorage,
          key: "wasnaker-query-cache",
          throttleTime: 1_000,
        })
  );

  if (persister) {
    void persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24 jam
    });
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
