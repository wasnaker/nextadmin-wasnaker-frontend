import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Branch" };

export default function BranchPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
