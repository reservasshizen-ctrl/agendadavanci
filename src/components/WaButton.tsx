import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/sns";
import { toast } from "sonner";

export function WaButton({
  phone,
  message,
  onOpened,
  children = "WhatsApp",
  size = "sm",
  className,
}: {
  phone?: string | null;
  message?: string;
  onOpened?: () => void;
  children?: React.ReactNode;
  size?: "sm" | "md" | "icon";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        const ok = openWhatsApp(phone, message);
        if (!ok) {
          toast.error("El paciente no tiene un número de WhatsApp válido.");
          return;
        }
        onOpened?.();
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg bg-success font-medium text-success-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-success focus-visible:outline-none",
        size === "sm" && "px-2.5 py-1.5 text-xs",
        size === "md" && "px-4 py-2 text-sm",
        size === "icon" && "size-8",
        className,
      )}
      title="Abrir WhatsApp con el mensaje preparado"
    >
      <MessageCircle className="size-4" />
      {size !== "icon" && children}
    </button>
  );
}
