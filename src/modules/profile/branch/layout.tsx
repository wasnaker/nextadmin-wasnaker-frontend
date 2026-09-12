import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Branch",
};

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
