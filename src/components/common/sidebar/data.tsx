import { HomeIcon, UserIcon } from "./icon";

export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        icon: <HomeIcon />,
        items: [
          {
            title: "Main",
            url: "/",
          },
        ],
      },
      {
        title: "Profile",
        url: "/profile",
        icon: <UserIcon />,
        items: [],
      },
    ],
  },
];
