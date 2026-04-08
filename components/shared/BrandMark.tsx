import Image from "next/image";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  showWordmark: _showWordmark = true,
}: {
  className?: string;
  /**
   * Kept for API compatibility. The wordmark is baked into the logo
   * image itself, so this prop is currently a no-op.
   */
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center", className)}>
      <div className="relative h-10 w-[92px] shrink-0">
        <Image
          src="/mathabah-logo.png"
          alt="Mathabah Learning Centre"
          fill
          sizes="92px"
          priority
          className="object-contain"
        />
      </div>
    </div>
  );
}
