"use client";

import { useEffect } from "react";

function isChunkError(message: string | undefined): boolean {
  return Boolean(
    message &&
      /ChunkLoadError|Failed to fetch dynamically imported module|Loading chunk \d+ failed|Importing a module script failed/i.test(
        message
      )
  );
}

/**
 * Root error boundary (App Router).
 *
 * Setelah deploy, tab yang masih terbuka memegang HTML lama yang menunjuk ke
 * chunk lama (sudah diganti) → ChunkLoadError saat navigasi. Solusi standar:
 * auto-reload SEKALI (dithrottle 30 detik) supaya user dapat HTML+chunk baru
 * tanpa perlu diminta "jangan dipakai dulu" — state aplikasi di server, aman.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const isChunk = isChunkError(error?.message);

  useEffect(() => {
    if (!isChunk || typeof window === "undefined") return;
    const key = "chunk-reload-at";
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last > 30_000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  }, [isChunk]);

  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 40 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Terjadi kesalahan</h1>
        <p style={{ color: "#666", marginBottom: 16 }}>
          {isChunk
            ? "Aplikasi baru saja diperbarui. Muat ulang untuk mendapatkan versi terbaru."
            : "Kesalahan tak terduga. Coba muat ulang halaman."}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Muat Ulang
        </button>
      </body>
    </html>
  );
}
