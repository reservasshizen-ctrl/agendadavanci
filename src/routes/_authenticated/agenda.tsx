import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppointmentRow } from "@/components/AppointmentRow";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { useAddAgendaDay, useAgendaDays, useAppointments, useDeleteAgendaDay } from "@/lib/db";
import { matchPatient } from "@/lib/search";
import { formatDate, todayISO } from "@/lib/sns";
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

export default function Agenda() {
  const { data: days = [] } = useAgendaDays();
  const addDay = useAddAgendaDay();
  const delDay = useDeleteAgendaDay();
  const [selected, setSelected] = useState<string | null>(null);
  const [newDate, setNewDate] = useState(todayISO());
  const [newLabel, setNewLabel] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const visibleDays = days.filter((d) => showPast || d.date >= todayISO());
  const current = selected ?? visibleDays[0]?.date ?? null;
  const currentDay = days.find((d) => d.date === current);

  const { data: appts = [], isLoading } = useAppointments(current ?? "1900-01-01", current ?? "1900-01-01");
  const filtered = appts
    .filter((a) => !query.trim() || (a.patient && matchPatient(a.patient, query)))
    .sort((x, y) => x.time.localeCompare(y.time));
  const busyMin = appts
    .filter((a) => a.status !== "cancelo" && a.status !== "reprogramo")
    .reduce((n, a) => n + a.duration, 0);

  const createDay = async () => {
    if (!newDate) return;
    if (days.some((d) => d.date === newDate)) {
      setSelected(newDate);
      toast.info("Ese día ya tiene pestaña");
      return;
    }
    try {
      await addDay.mutateAsync({ date: newDate, label: newLabel.trim() || null });
      setSelected(newDate);
      setNewLabel("");
      toast.success("Día habilitado para agendar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el día");
    }
  };

  const removeDay = async () => {
    if (!currentDay) return;
    if (appts.length > 0) {
      toast.error("Este día tiene turnos. Movelos o cancelalos antes de quitar la pestaña.");
      return;
    }
    if (!window.confirm(`¿Quitar la pestaña del ${formatDate(currentDay.date)}?`)) return;
    await delDay.mutateAsync(currentDay.id);
    setSelected(null);
  };

  const weekday = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("es", { weekday: "long" });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Consulta 10 min · Revisión 10 min · Evaluación y análisis 60 min
          </p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!currentDay}>
          <CalendarPlus className="mr-2 size-4" /> Agregar turno
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        {/* Pestañas de días */}
        <aside className="surface space-y-3 p-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Nuevo día de atención</p>
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <Input placeholder="Nota (opcional)" value={newLabel} maxLength={40} onChange={(e) => setNewLabel(e.target.value)} />
            <Button size="sm" className="w-full" onClick={createDay} disabled={addDay.isPending}>
              <Plus className="mr-1 size-4" /> Crear pestaña
            </Button>
          </div>
          <div className="border-t pt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Días</p>
              <button className="text-xs text-muted-foreground underline" onClick={() => setShowPast((v) => !v)}>
                {showPast ? "Ocultar pasados" : "Ver pasados"}
              </button>
            </div>
            {visibleDays.length === 0 ? (
              <p className="text-xs text-muted-foreground">Todavía no hay días. Creá uno arriba.</p>
            ) : (
              <nav className="space-y-1">
                {visibleDays.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelected(d.date)}
                    className={cn(
                      "w-full rounded-md border-l-4 px-3 py-2 text-left text-sm transition-colors",
                      d.date === current
                        ? "border-primary bg-primary/10 font-semibold"
                        : "border-transparent hover:bg-secondary",
                    )}
                  >
                    <span className="block capitalize">{weekday(d.date)} {formatDate(d.date)}</span>
                    {d.label && <span className="block text-xs text-muted-foreground">{d.label}</span>}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </aside>

        {/* Página del día */}
        <section className="surface min-h-[400px] p-4">
          {!currentDay ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Creá o elegí un día de atención para ver y agendar turnos.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h2 className="text-lg font-semibold capitalize">
                    {weekday(currentDay.date)} {formatDate(currentDay.date)}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {appts.length} turnos · {busyMin} min ocupados
                    {currentDay.label ? ` · ${currentDay.label}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48">
                    <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Buscar..." value={query} onChange={(e) => setQuery(e.target.value)} />
                  </div>
                  <Button size="icon" variant="ghost" onClick={removeDay} title="Quitar pestaña">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando turnos...</p>
              ) : filtered.length === 0 ? (
                <button
                  onClick={() => setOpen(true)}
                  className="w-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground hover:bg-secondary"
                >
                  Sin turnos. Tocá acá para agendar el primero.
                </button>
              ) : (
                <div className="space-y-3">
                  {filtered.map((a) => (
                    <AppointmentRow key={a.id} appt={a} />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <AppointmentDialog open={open} onOpenChange={setOpen} defaultDate={current ?? undefined} />
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
