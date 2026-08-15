import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppointmentRow } from "@/components/AppointmentRow";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { useAppointments } from "@/lib/db";
import { matchPatient } from "@/lib/search";
import { addDaysISO, formatDate, todayISO } from "@/lib/sns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda | Centro SNS" },
      { name: "description", content: "Agenda de turnos por día, semana y mes con control de envío de horarios." },
      { property: "og:title", content: "Agenda | Centro SNS" },
      { property: "og:description", content: "Agenda de turnos por día, semana y mes de Centro SNS." },
    ],
  }),
  component: Agenda,
});

type View = "dia" | "semana" | "mes";
type Filter = "todos" | "enviados" | "no_enviados";

export default function Agenda() {
  const [view, setView] = useState<View>("dia");
  const [anchor, setAnchor] = useState(todayISO());
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const range = useMemo(() => {
    if (view === "dia") return { from: anchor, to: anchor };
    if (view === "semana") {
      const d = new Date(`${anchor}T00:00:00`);
      const start = addDaysISO(anchor, -((d.getDay() + 6) % 7));
      return { from: start, to: addDaysISO(start, 6) };
    }
    const [y, m] = anchor.split("-").map(Number);
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    const last = new Date(y!, m!, 0).getDate();
    return { from: first, to: `${y}-${String(m).padStart(2, "0")}-${last}` };
  }, [view, anchor]);

  const { data: appts = [], isLoading } = useAppointments(range.from, range.to);

  const filtered = appts.filter((a) => {
    if (filter === "enviados" && !a.schedule_sent) return false;
    if (filter === "no_enviados" && a.schedule_sent) return false;
    if (query.trim() && a.patient && !matchPatient(a.patient, query)) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, a) => {
    (acc[a.date] ??= []).push(a);
    return acc;
  }, {});

  const step = view === "dia" ? 1 : view === "semana" ? 7 : 30;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(range.from)}
            {range.from !== range.to ? ` — ${formatDate(range.to)}` : ""}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <CalendarPlus className="mr-2 size-4" /> Agregar turno
        </Button>
      </header>

      <div className="surface flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => setAnchor(addDaysISO(anchor, -step))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setAnchor(todayISO())}>
            Hoy
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setAnchor(addDaysISO(anchor, step))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <Tabs
          value={view}
          onChange={(v) => setView(v as View)}
          options={[
            ["dia", "Día"],
            ["semana", "Semana"],
            ["mes", "Mes"],
          ]}
        />

        <Tabs
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          options={[
            ["todos", "Todos"],
            ["no_enviados", "No enviados"],
            ["enviados", "Enviados"],
          ]}
        />

        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar paciente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando turnos...</p>
      ) : filtered.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-muted-foreground">
          No hay turnos que coincidan con los filtros.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{formatDate(date)}</h2>
              <div className="space-y-3">
                {items.map((a) => (
                  <AppointmentRow key={a.id} appt={a} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AppointmentDialog open={open} onOpenChange={setOpen} defaultDate={anchor} />
    </div>
  );
}

export function Tabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="inline-flex rounded-lg bg-secondary p-1">
      {options.map(([key, text]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
