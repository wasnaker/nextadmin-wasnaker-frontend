"use client";

import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/tailgrids/core/input-group";
import { Label } from "@/components/tailgrids/core/label";
import { Backdrop, OverlayWrapper } from "@/components/tailgrids/core/overlay";
import { TextField } from "@/components/tailgrids/core/text-field";
import { api } from "@/services/spine/api";
import { cn } from "@/utils/cn";
import { Eye, EyeDisabled } from "@tailgrids/icons";
import { useState } from "react";
import { Form } from "react-aria-components";
import { securityItems } from "./data";

export default function SecurityTabContent() {
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Simpan referensi form SEBELUM await — synthetic event React di-recycle
    // setelah handler async menyerah (currentTarget jadi null).
    const form = event.currentTarget;
    const fd = new FormData(form);
    const payload = {
      current_password: String(fd.get("current_password") ?? ""),
      password: String(fd.get("password") ?? ""),
      password_confirmation: String(fd.get("password_confirmation") ?? ""),
    };
    if (payload.password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await api("/api/v1/user", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg =
          res.error ??
          `Gagal mengubah password (HTTP ${res.status ?? "?"})`;
        console.error("[security] ganti password ditolak:", res.status, res.data);
        setError(msg);
        return;
      }
      console.info("[security] password berhasil diubah");
      form.reset();
      setOpenPasswordDialog(false);
    } catch (err) {
      console.error("[security] exception saat ganti password:", err);
      setError(
        `Gagal mengubah password (${
          err instanceof Error ? err.message : typeof err
        })`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl leading-7 font-semibold text-text-primary">
        Security
      </h2>

      <div className="mt-6 space-y-2 divide-y divide-card-border">
        {securityItems.map(({ icon: Icon, title, description, actionLabel }) => (
          <div
            key={title}
            className="flex flex-col gap-4 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background-gray-secondary_alt text-icon-secondary">
                <Icon />
              </div>

              <div className="min-w-0">
                <p className="text-sm leading-5 font-medium text-text-primary">
                  {title}
                </p>
                <p className="mt-1 text-xs leading-4 text-text-tertiary">
                  {description}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto shrink-0 rounded-none py-2 pr-0 text-base text-brand-500 hover:bg-transparent hover:text-brand-600 focus:ring-0"
              onPress={() => {
                setError(null);
                setOpenPasswordDialog(true);
              }}
            >
              {actionLabel}
            </Button>
          </div>
        ))}
      </div>

      <OverlayWrapper isOpen={openPasswordDialog} onOpenChange={setOpenPasswordDialog}>
        <Backdrop isDismissable>
          <Dialog className="max-w-108.75 p-0">
            <Form onSubmit={onChangePassword}>
              <DialogHeader className="gap-1 border-b border-card-border py-4 pr-14 pl-5">
                <DialogTitle className="text-xl leading-7">
                  Update Password
                </DialogTitle>
                <DialogDescription className="text-text-tertiary">
                  Create a secure password to keep your account safe
                </DialogDescription>
              </DialogHeader>

              <DialogBody className="space-y-4 px-5 py-4">
                <TextField className="gap-1.5">
                  <Label htmlFor="current-password">Current Password</Label>
                  <InputGroup>
                    <InputGroupInput
                      id="current-password"
                      name="current_password"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                      required
                    />
                    <InputGroupButton
                      size="icon-sm"
                      className="mr-1"
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? (
                        <EyeDisabled className="size-5" />
                      ) : (
                        <Eye className="size-5" />
                      )}
                    </InputGroupButton>
                  </InputGroup>
                </TextField>

                <TextField className="gap-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <InputGroup>
                    <InputGroupInput
                      id="new-password"
                      name="password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Choose a new password"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    <InputGroupButton
                      size="icon-sm"
                      className="mr-1"
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? (
                        <EyeDisabled className="size-5" />
                      ) : (
                        <Eye className="size-5" />
                      )}
                    </InputGroupButton>
                  </InputGroup>
                </TextField>

                <TextField className="gap-1.5">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <InputGroup>
                    <InputGroupInput
                      id="confirm-password"
                      name="password_confirmation"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your new password"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    <InputGroupButton
                      size="icon-sm"
                      className="mr-1"
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeDisabled className="size-5" />
                      ) : (
                        <Eye className="size-5" />
                      )}
                    </InputGroupButton>
                  </InputGroup>
                </TextField>

                {error && <p className="text-sm text-red-500">{error}</p>}
              </DialogBody>

              <DialogFooter className="border-t border-card-border px-5 py-4">
                <DialogClose
                  className={cn(
                    buttonStyles({
                      appearance: "outline",
                      size: "lg",
                      className: "px-3.5 text-sm",
                    }),
                  )}
                >
                  Cancel
                </DialogClose>
                <Button
                  type="submit"
                  size="lg"
                  className="px-3.5 text-sm"
                  isDisabled={saving}
                >
                  {saving ? "Menyimpan…" : "Apply Changes"}
                </Button>
              </DialogFooter>
            </Form>
          </Dialog>
        </Backdrop>
      </OverlayWrapper>
    </div>
  );
}
