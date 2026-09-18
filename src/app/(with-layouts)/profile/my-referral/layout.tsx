import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Referral" };

export default function MyReferralPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
