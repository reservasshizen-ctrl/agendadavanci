import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { FichasBook } from "@/components/FichasBook";
import { useAppointments } from "@/lib/db";
import { formatTime, label, todayISO } from "@/lib/sns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/fichas")({
  head: () => ({
    meta: [
      { title: "Fichas por sesión | Centro SNS" },
      { name: "description", content: "Fichas clínicas de los pacientes ordenadas según la agenda del día." },
      { property: "og:title", content: "Fichas por sesión | Centro SNS" },
      { property: "og:description", content: "Fichas clínicas ordenadas según la agenda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FichasPage,
});

const shift = (iso: string, d: number) => {
  const t = new Date(`${iso}T12:00:00`);
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
};
const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "long" });

function FichasPage() {
  const [date, setDate] = useState(todayISO());
  const days = Array.from({ length: 7 }, (_, i) => shift(date, i - 3));
  const { data: appts = [], isLoading } = useAppointments(date, date);
  const [selId, setSelId] = useState<string | null>(null);
  const sel = appts.find((a) => a.id === selId) ?? appts[0];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Fichas</h1>
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="surface space-y-3 p-3">
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" aria-label="Semana anterior" onClick={() => setDate(shift(date, -7))}>
              <ChevronLeft className="size-4" />
            </Button>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="fl flex-1" />
            <Button size="icon" variant="ghost" aria-label="Semana siguiente" onClick={() => setDate(shift(date, 7))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="flex gap-1 overflow-x-auto lg:flex-col">
            {days.map((d) => (
              <button
                key={d}
                onClick={() => (setDate(d), setSelId(null))}
                className={cn(
                  "shrink-0 rounded-md border-l-4 px-2 py-1.5 text-left text-sm capitalize",
                  d === date ? "border-primary bg-secondary font-semibold" : "border-transparent text-muted-foreground hover:bg-secondary",
                )}
              >
                {longDate(d)}
              </button>
            ))}
          </div>
          <div className="rounded-md border border-border bg-card">
            <p className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
              Turnos del día ({appts.length})
            </p>
            {isLoading ? (
              <p className="p-3 text-sm text-muted-foreground">Cargando...</p>
            ) : appts.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">Sin turnos en esta fecha.</p>
            ) : (
              <ol className="divide-y divide-border">
                {appts.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => setSelId(a.id)}
                      className={cn("w-full space-y-0.5 px-3 py-2 text-left text-sm", sel?.id === a.id && "bg-secondary")}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{formatTime(a.time)}</span>
                        <StatusBadge value={a.status} />
                      </span>
                      <span className="block truncate">{a.patient?.full_name}</span>
                      <span className="block text-xs text-muted-foreground">{label(a.appointment_type)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
        <main>
          {sel?.patient ? (
            <FichasBook key={sel.patient.id} patient={sel.patient} />
          ) : (
            <p className="surface p-6 text-sm text-muted-foreground">Elegí un turno de la lista para abrir su ficha.</p>
          )}
        </main>
      </div>
    </div>
  );
}
