"use client";

import { Table as MantineTable } from "@mantine/core";
import { cn } from "@/utils/cn";
import type { ComponentProps } from "react";

type TableRootProps = ComponentProps<"table"> & {
  fullBleed?: boolean;
};

export function TableRoot({ className, fullBleed, ...props }: TableRootProps) {
  return (
    <div className="overflow-x-auto">
      <MantineTable
        className={cn("min-w-full text-left", fullBleed ? "" : "rounded-lg border border-border-primary", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <MantineTable.Thead className={cn("[&_th]:text-xs", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <MantineTable.Tbody className={className} {...props} />;
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return <MantineTable.Th className={cn("px-5 py-3.5 font-medium", className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return <MantineTable.Tr className={className} {...props} />;
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <MantineTable.Td className={cn("px-5 py-3.5 font-medium text-text-100", className)} {...props} />;
}
