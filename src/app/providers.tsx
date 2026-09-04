"use client";

import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
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
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
