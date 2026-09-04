import { BellIcon, BranchIcon, CompanyIcon, ShieldCheckIcon, UserIcon } from "./icons";

export const tabsItems = [
  {
    href: "/profile/account",
    icon: <UserIcon />,
    title: "Account",
    description: "Manage your personal data",
  },
  {
    href: "/profile/company",
    icon: <CompanyIcon />,
    title: "My Company",
    description: "Company (HO) your account belongs to",
  },
  {
    href: "/profile/branch",
    icon: <BranchIcon />,
    title: "My Branch",
    description: "Branches of your company",
  },
  {
    href: "/profile/security",
    icon: <ShieldCheckIcon />,
    title: "Security",
    description: "Set your password, authentication & etc",
  },
  {
    href: "/profile/notification",
    icon: <BellIcon />,
    title: "Notification",
    description: "Customize your notification preferences",
  },
];
