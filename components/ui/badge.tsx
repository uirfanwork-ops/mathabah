import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-amber-300 bg-amber-50 text-amber-900",
        secondary:
          "border-gray-300 bg-gray-100 text-gray-700",
        destructive:
          "border-red-300 bg-red-100 text-red-800",
        success:
          "border-emerald-400 bg-emerald-100 text-emerald-800",
        warning:
          "border-amber-400 bg-amber-100 text-amber-800",
        outline: "border-gray-300 bg-white text-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
