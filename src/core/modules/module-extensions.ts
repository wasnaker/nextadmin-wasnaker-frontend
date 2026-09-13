"use client";

// Registry extensions = @wasnaker/web-core (merge penuh, keputusan split plan Task 3).
// Re-export menjaga seluruh import "@/core/modules/module-extensions" tetap jalan.
export {
  useModuleExtensions,
  type DetailTab,
  type ModuleMenuItem,
  type ModuleWidget,
  type ModuleExtensions,
  type ProfileTab,
} from "@wasnaker/web-core";