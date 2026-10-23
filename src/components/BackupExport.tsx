import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const TABLES = [
  ["patients", "Pacientes"],
  ["appointments", "Turnos"],
  ["reviews", "Revisiones"],
  ["treatments", "Tratamientos"],
  ["treatment_sessions", "Sesiones"],
  ["products", "Artículos"],
  ["sales", "Ventas"],
  ["sale_items", "Detalle de ventas"],
] as const;

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function BackupExport() {
  const [busy, setBusy] = useState<string | null>(null);
  const download = async (table: (typeof TABLES)[number][0], label: string) => {
    setBusy(table);
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw error;
      const blob = new Blob(["\uFEFF" + toCsv((data ?? []) as Record<string, unknown>[])], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${label.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo exportar");
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase">Copias de seguridad</h2>
      <div className="surface flex flex-wrap gap-2 p-4">
        {TABLES.map(([t, label]) => (
          <Button key={t} size="sm" variant="outline" disabled={busy !== null} onClick={() => download(t, label)}>
            {busy === t ? "Descargando…" : `Descargar ${label}`}
          </Button>
        ))}
        <p className="w-full text-xs text-muted-foreground">Los archivos se abren con Excel.</p>
      </div>
    </section>
  );
}
