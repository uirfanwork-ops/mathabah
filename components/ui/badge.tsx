import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-brand-gold/40 bg-brand-gold/10 text-brand-goldlight",
        secondary:
          "border-transparent bg-brand-ink text-muted-foreground",
        destructive:
          "border-destructive/40 bg-destructive/15 text-red-200",
        success:
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
        warning:
          "border-amber-500/40 bg-amber-500/10 text-amber-200",
        outline: "border-brand-gold/30 text-brand-goldlight",
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
