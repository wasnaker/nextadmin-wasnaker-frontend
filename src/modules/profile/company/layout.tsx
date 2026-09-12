import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Company",
};

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
