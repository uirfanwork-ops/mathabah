import Image from "next/image";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-10 w-10 shrink-0">
        <Image
          src="/mathabah-logo.png"
          alt="Mathabah Learning Centre"
          fill
          sizes="40px"
          priority
          className="object-contain"
        />
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-semibold text-brand-goldlight">
            Mathabah Learning Centre
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-brand-gold/70">
            Student Portal
          </span>
        </div>
      )}
    </div>
  );
}
