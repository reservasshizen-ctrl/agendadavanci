import { cn } from "@/lib/utils";
import { label, tone } from "@/lib/sns";

const toneClasses: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-danger",
};

export function StatusBadge({
  value,
  className,
  dot = true,
}: {
  value?: string | null;
  className?: string;
  dot?: boolean;
}) {
  const t = tone(value);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[t],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", `bg-current`)} />}
      {label(value)}
    </span>
  );
}

export function SentBadge({ sent }: { sent: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        sent ? toneClasses["success"] : toneClasses["warning"],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {sent ? "Enviado" : "No enviado"}
    </span>
  );
}
