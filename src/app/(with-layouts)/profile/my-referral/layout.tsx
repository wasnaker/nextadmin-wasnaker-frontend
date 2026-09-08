import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Referral",
};

export default function MyReferralLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}