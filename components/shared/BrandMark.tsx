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
        <div className="absolute inset-0 rotate-45 rounded-md brand-gradient shadow-lg shadow-brand-crimson/30" />
        <div className="absolute inset-[3px] rotate-45 rounded-[3px] border border-brand-gold/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-lg font-bold text-brand-parchment">
            M
          </span>
        </div>
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-tight">
          <span className="font-serif text-lg font-semibold text-brand-goldlight">
            Mathabah
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-brand-gold/70">
            Institute
          </span>
        </div>
      )}
    </div>
  );
}
