import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Company" };

export default function CompanyPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
