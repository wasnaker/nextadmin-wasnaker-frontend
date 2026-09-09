"use client";

import { Button as MantineButton } from "@mantine/core";
import { cn } from "@/utils/cn";
import { cva } from "class-variance-authority";

// Dipertahankan: dipakai calendar.tsx / select.tsx / sidebar / security page.
export const buttonStyles = cva(
  "flex items-center justify-center rounded-lg text-sm font-medium transition outline-none focus:ring-4 disabled:pointer-events-none [&>svg]:text-current!",
  {
    variants: {
      variant: { primary: "", danger: "", success: "", ghost: "" },
      appearance: { fill: "", outline: "", ghost: "" },
      iconOnly: { true: "", false: "" },
      size: { xs: "", sm: "", md: "", lg: "", xl: "", xxl: "" },
    },
  },
);

export type ButtonProps = {
  variant?: "primary" | "danger" | "success" | "ghost";
  appearance?: "fill" | "outline" | "ghost";
  iconOnly?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
  focused?: boolean;
  isDisabled?: boolean;
  onPress?: () => void;
  type?: "button" | "submit" | "reset";
  title?: string;
  className?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  "aria-label"?: string;
  "data-testid"?: string;
  slot?: string;
};

const toneToColor: Record<string, string> = {
  primary: "blue",
  danger: "red",
  success: "green",
};

const sizeToMantine: Record<string, string> = {
  xs: "compact-xs",
  sm: "compact-sm",
  md: "compact-md",
  lg: "compact-lg",
  xl: "compact-xl",
  xxl: "xl",
};

export function Button({
  variant = "primary",
  appearance = "fill",
  iconOnly,
  size = "md",
  focused,
  isDisabled,
  onPress,
  className,
  children,
  ...props
}: ButtonProps) {
  const mantineVariant =
    appearance === "outline" ? "outline" : appearance === "ghost" || variant === "ghost" ? "subtle" : "filled";

  return (
    <MantineButton
      color={variant === "ghost" ? "blue" : toneToColor[variant] ?? "blue"}
      variant={mantineVariant}
      size={sizeToMantine[size] as never}
      disabled={isDisabled}
      onClick={onPress ?? props.onClick}
      data-focused={focused ? "true" : undefined}
      className={cn(iconOnly && "p-0", className)}
      {...props}
    >
      {children}
    </MantineButton>
  );
}
