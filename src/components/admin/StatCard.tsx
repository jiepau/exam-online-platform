import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const useCountUp = (target: number, duration = 700) => {
  const [value, setValue] = useState(0);
  const frame = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutCubic for a smooth, professional feel
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, duration]);

  return value;
};

export interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: number;
  hint?: string | null;
  loading?: boolean;
  className?: string;
}

const StatCard = ({ icon: Icon, title, value, hint, loading, className }: StatCardProps) => {
  const animated = useCountUp(loading ? 0 : value);

  return (
    <Card
      className={cn(
        "animate-fade-in border-border/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        className,
      )}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold leading-tight text-foreground">
            {loading ? <span className="text-muted-foreground">—</span> : animated.toLocaleString("id-ID")}
          </p>
          {hint && !loading && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
