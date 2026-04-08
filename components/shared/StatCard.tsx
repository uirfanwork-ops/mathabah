import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
  accent?: "gold" | "red" | "emerald";
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
  accent = "gold",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-brand-gold/20 bg-card/80 p-5 shadow-lg shadow-black/30 backdrop-blur",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-serif text-3xl font-semibold text-brand-parchment">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md border",
              accent === "gold" &&
                "border-brand-gold/40 bg-brand-gold/10 text-brand-gold",
              accent === "red" &&
                "border-brand-red/50 bg-brand-red/10 text-brand-red",
              accent === "emerald" &&
                "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
