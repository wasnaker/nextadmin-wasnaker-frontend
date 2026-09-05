import type { ReactNode } from "react";

const StaffIcon = () => <span className='text-lg'>👥</span>;
const CutiIcon = () => <span className='text-lg'>🏖️</span>;
const GajiIcon = () => <span className='text-lg'>💰</span>;

export const tabsItems: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}[] = [
  {
    href: "/platform/staff",
    icon: <StaffIcon />,
    title: "Staff",
    description: "Daftar staf platform",
  },
  {
    href: "/platform/cuti",
    icon: <CutiIcon />,
    title: "Cuti",
    description: "Pengajuan & saldo cuti",
  },
  {
    href: "/platform/gaji",
    icon: <GajiIcon />,
    title: "Gaji",
    description: "Payroll staf platform",
  },
];
