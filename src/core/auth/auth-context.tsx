"use client";

// Core auth = @wasnaker/web-core (merge penuh, keputusan split plan Task 3).
// Re-export menjaga seluruh import "@/core/auth/auth-context" tetap jalan.
export {
  AuthProvider,
  useAuth,
  can,
  type AuthUser,
} from "@wasnaker/web-core";