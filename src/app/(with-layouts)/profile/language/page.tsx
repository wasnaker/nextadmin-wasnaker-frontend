"use client";

import { useAuth } from "@/core/auth/auth-context";
import { api } from "@/lib/api/client";
import { cn } from "@/utils/cn";
import { useState } from "react";
import { useT } from "@/core/i18n";

/** Label + kode locale — sama dengan picker di header. */
const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "id", label: "Indonesia" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
];

export default function LanguagePage() {
  const { user, updateUser } = useAuth();
  const t = useT();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function pick(code: string) {
    if (saving || code === user?.locale) return;
    setSaving(true);
    const res = await api<{ locale: string }>("/api/v1/user/locale", {
      method: "PUT",
      body: JSON.stringify({ locale: code }),
    });
    if (res.ok && user) {
      updateUser({ ...user, locale: code });
      setNotice(t("Tersimpan ✓"));
    } else {
      setNotice(res.error ?? t("Failed to save"));
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{t("Language")}</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {t("Choose your preferred language.")}
        </p>
      </div>

      {notice && <p className="text-sm text-text-secondary">{notice}</p>}

      <div className="flex flex-col gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            disabled={saving}
            onClick={() => pick(l.code)}
            className={cn(
              "flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors",
              user?.locale === l.code
                ? "border-primary-300 bg-primary-50 font-medium text-text-primary"
                : "border-card-border bg-card-background text-text-secondary hover:text-text-primary",
            )}
          >
            <span>{l.label}</span>
            {user?.locale === l.code && <span>✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
