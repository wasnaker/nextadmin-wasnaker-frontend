"use client";

import { Tabs as MantineTabs } from "@mantine/core";
import { cn } from "@/utils/cn";

type StyleVariant = "default" | "minimal";
type TabDirection = "vertical" | "horizontal";

type TabsProps = {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
  variant?: StyleVariant;
  direction?: "vertical" | "horizontal";
};

export function TabRoot({ defaultValue, children, className, variant = "default", direction = "vertical" }: TabsProps) {
  return (
    <div
      className={cn(
        "max-w-full rounded-xl border border-card-border",
        direction === "horizontal" ? "flex gap-8 p-6 max-sm:flex-wrap" : "",
        variant === "minimal" && direction === "vertical" ? "px-6 pt-3" : "",
        className,
      )}
    >
      <MantineTabs
        defaultValue={defaultValue}
        orientation={direction === "horizontal" ? "vertical" : "horizontal"}
        className="w-full"
      >
        {children}
      </MantineTabs>
    </div>
  );
}

type TabListProps = {
  children: React.ReactNode;
  className?: string;
};

export function TabList({ children, className }: TabListProps) {
  return (
    <MantineTabs.List
      className={cn(
        "border-b border-card-border",
        "flex overflow-x-auto overflow-y-hidden",
        className,
      )}
    >
      {children}
    </MantineTabs.List>
  );
}

type TabTriggerProps = React.HTMLAttributes<HTMLButtonElement> & {
  value: string;
  icon?: React.ReactNode;
  badge?: string | number;
};

export function TabTrigger({ value, children, className, icon, badge, ...props }: TabTriggerProps) {
  return (
    <MantineTabs.Tab value={value} leftSection={icon} rightSection={badge ? <span className="text-xs">{badge}</span> : undefined} className={className} {...props}>
      {children}
    </MantineTabs.Tab>
  );
}

type TabContentProps = {
  value: string;
  children: React.ReactNode;
  className?: string;
};

export function TabContent({ value, children, className }: TabContentProps) {
  return (
    <MantineTabs.Panel value={value} className={cn("py-6", className)}>
      {children}
    </MantineTabs.Panel>
  );
}
