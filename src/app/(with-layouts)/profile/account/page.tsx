"use client";

import { useRef, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/tailgrids/core/avatar";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";
import { TextField } from "@/components/tailgrids/core/text-field";
import { api, API_URL } from "@/lib/api/client";
import { useAuth } from "@/core/auth/auth-context";
import { Form } from "react-aria-components";
import { useT } from "@/core/i18n";

const AVATAR_MAX = 2 * 1024 * 1024; // 2MB — sama dengan validasi backend

type Status = { type: "error" | "success"; text: string } | null;

export default function AccountPage() {
  const { user, updateUser } = useAuth();
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  if (!user) return null; // halaman di balik auth guard

  const avatarSrc = user.avatar ? `${API_URL}/storage/${user.avatar}` : null;

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const name = String(fd.get("fullName") ?? "").trim();
    if (!name) return;

    setSaving(true);
    setStatus(null);
    try {
      const res = await api("/api/v1/user", {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setStatus({ type: "error", text: res.error ?? t("Failed to save") });
        return;
      }
      updateUser(res.data as never);
      setStatus({ type: "success", text: t("Profile saved.") });
    } catch {
      setStatus({ type: "error", text: t("Failed to save") });
    } finally {
      setSaving(false);
    }
  }

  async function onPickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // izinkan pilih file sama berulang kali
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", text: t("File must be an image.") });
      return;
    }
    if (file.size > AVATAR_MAX) {
      setStatus({ type: "error", text: t("Maximum size is 2MB.") });
      return;
    }

    setAvatarBusy(true);
    setStatus(null);
    try {
      const body = new FormData();
      body.append("avatar", file);
      const res = await api("/api/v1/user/avatar", { method: "POST", body });
      if (!res.ok) {
        setStatus({ type: "error", text: res.error ?? t("Failed to upload avatar") });
        return;
      }
      updateUser(res.data as never);
      setStatus({ type: "success", text: t("Avatar updated.") });
    } catch {
      setStatus({ type: "error", text: t("Failed to upload avatar") });
    } finally {
      setAvatarBusy(false);
    }
  }

  async function onRemoveAvatar() {
    if (!user?.avatar) return;
    setAvatarBusy(true);
    setStatus(null);
    try {
      const res = await api("/api/v1/user/avatar", { method: "DELETE" });
      if (!res.ok) {
        setStatus({ type: "error", text: res.error ?? t("Failed to delete avatar") });
        return;
      }
      updateUser(res.data as never);
      setStatus({ type: "success", text: t("Avatar deleted.") });
    } catch {
      setStatus({ type: "error", text: t("Failed to delete avatar") });
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Account Details Card */}
      <Card className="bg-transparent p-5">
        <h2 className="mb-6 text-xl leading-7 font-semibold text-text-primary">
                    {t("Account Details")}
                  </h2>

                  <div className="mb-6 flex items-center gap-4">
                    <Avatar size="xxl">
                      {avatarSrc && <AvatarImage src={avatarSrc} alt={user.name} />}
                      <AvatarFallback className="border border-border-secondary-alt bg-background-gray-secondary_alt text-xl font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-3">
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={onPickAvatar}
                        />
                        <Button
                          appearance="outline"
                          size="sm"
                          type="button"
                          isDisabled={avatarBusy}
                          onPress={() => fileRef.current?.click()}
                        >
                          {avatarBusy ? t("Uploading…") : t("Change Avatar")}
                        </Button>
                        <Button
                          appearance="outline"
                          variant="danger"
                          size="sm"
                          type="button"
                          isDisabled={!user.avatar || avatarBusy}
                          onPress={onRemoveAvatar}
                        >
                          {t("Remove")}
                        </Button>
                      </div>
                      <p className="text-xs leading-4 text-text-tertiary">
                        {t("Accepts PNG, JPEG, GIF; max size 2MB.")}
                      </p>
                    </div>
                  </div>

                  <Form onSubmit={onSave} className="space-y-6">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <TextField className="w-full gap-2.5">
                        <Label>{t("Full Name")}</Label>
                        <Input
                          name="fullName"
                          defaultValue={user.name}
                          className="w-full"
                          required
                        />
                      </TextField>

                      <div className="flex w-full flex-col gap-2.5">
                        <Label>{t("Email address")}</Label>
                        {/* Tanpa wrapper TextField: RAC tidak merender defaultValue saat
                            field disabled/readOnly → Input mandiri + value terkontrol. */}
                        <Input
                          type="email"
                          value={user.email}
                          disabled
                          className="w-full"
                        />
                        <p className="text-xs leading-4 text-text-tertiary">
                          {t("Email cannot be changed by yourself — please contact admin.")}
                        </p>
                      </div>
                    </div>

                    {status && (
                      <p
                        className={
                          status.type === "error"
                            ? "text-sm text-red-500"
                            : "text-sm text-green-600"
                        }
                      >
                        {status.text}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-3">
                      <Button
                        appearance="outline"
                        variant="primary"
                        size="lg"
                        type="button"
                        className="px-3.5 text-sm"
                        onPress={() => setStatus(null)}
                      >
                        {t("Cancel")}
                      </Button>
                      <Button
                        variant="primary"
                        size="lg"
                        type="submit"
                        className="px-3.5 text-sm"
                        isDisabled={saving}
                      >
                        {saving ? t("Saving…") : t("Save Changes")}
                      </Button>
                    </div>
                  </Form>
      </Card>
    </div>
  );
}
