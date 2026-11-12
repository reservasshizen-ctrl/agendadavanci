import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { APPOINTMENT_TYPES, formatDate, formatTime, label, overlappingAppointments, todayISO, typeDuration, type Patient } from "@/lib/sns";
import { useAgendaDays, useAppointments, useSaveAppointment } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PatientPicker } from "@/components/PatientPicker";
import { Field } from "@/components/PatientDialog";

export function AppointmentDialog({
  open,
  onOpenChange,
  patient,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient?: Patient | null;
  defaultDate?: string | undefined;
}) {
  const [selected, setSelected] = useState<Patient | null>(patient ?? null);
  const [date, setDate] = useState(defaultDate ?? todayISO());
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("30");
  const [type, setType] = useState<string>("consulta");
  const [professional, setProfessional] = useState("");
  const [notes, setNotes] = useState("");
  const save = useSaveAppointment();
  const { data: dayAppts = [] } = useAppointments(date, date);
  const { data: days = [] } = useAgendaDays();
  const openDays = days.filter((d) => d.date >= todayISO() || d.date === defaultDate);
  const dayAllowed = days.some((d) => d.date === date);

  // Sugiere la hora siguiente al último turno del día.
  const nextFree = () => {
    const active = dayAppts.filter((a) => a.status !== "cancelo" && a.status !== "reprogramo");
    if (!active.length) return "08:00";
    const end = Math.max(...active.map((a) => { const [h, m] = a.time.split(":").map(Number); return h! * 60 + m! + a.duration; }));
    return `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  };
  const [timeTouched, setTimeTouched] = useState(false);
  useEffect(() => {
    if (open && !timeTouched) setTime(nextFree());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date, dayAppts.length]);
  const overlaps = overlappingAppointments(dayAppts, {
    time,
    duration: Number(duration) || 30,
    professional,
  });

  useEffect(() => {
    if (!open) return;
    setSelected(patient ?? null);
    setDate(defaultDate ?? todayISO());
    setTimeTouched(false);
    setDuration("10");
    setType("consulta");
    setProfessional("");
    setNotes("");
  }, [open, patient, defaultDate]);

  const submit = async () => {
    if (!selected) {
      toast.error("Seleccioná un paciente");
      return;
    }
    if (!dayAllowed) {
      toast.error("Ese día no está habilitado en la agenda. Creá la pestaña primero.");
      return;
    }
    if (!date || !time) {
      toast.error("Indicá fecha y hora");
      return;
    }
    if (
      overlaps.length > 0 &&
      !window.confirm("Este profesional ya tiene un turno en ese horario. ¿Agendar igual?")
    )
      return;
    try {
      await save.mutateAsync({
        patient_id: selected.id,
        date,
        time,
        duration: Number(duration) || 30,
        appointment_type: type,
        professional: professional.trim() || null,
        notes: notes.trim() || null,
        status: "pendiente",
      });
      toast.success("Turno agendado");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el turno");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar turno</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Paciente">
            <PatientPicker value={selected} onChange={setSelected} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={dayAllowed ? date : ""}
                onChange={(e) => setDate(e.target.value)}
              >
                <option value="" disabled>
                  {openDays.length ? "Elegí un día" : "No hay días habilitados"}
                </option>
                {openDays.map((d) => (
                  <option key={d.id} value={d.date}>
                    {formatDate(d.date)}{d.label ? ` · ${d.label}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hora">
              <Input type="time" value={time} onChange={(e) => { setTimeTouched(true); setTime(e.target.value); }} />
            </Field>
          </div>
          <Field label="Tipo de turno">
            <div className="grid grid-cols-3 gap-2">
              {APPOINTMENT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); setDuration(String(typeDuration(t))); }}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                    type === t ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-secondary",
                  )}
                >
                  {label(t)}
                  <span className="block text-[11px] opacity-80">{typeDuration(t)} min</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Profesional">
            <Input value={professional} onChange={(e) => setProfessional(e.target.value)} maxLength={100} />
          </Field>
          {overlaps.length > 0 && (
            <div className="rounded-lg border border-warning bg-warning-soft p-3 text-sm text-warning-foreground">
              Superposición: {professional} ya tiene{" "}
              {overlaps.map((a) => `${formatTime(a.time)} (${a.duration} min)`).join(", ")} ese día.
            </div>
          )}
          <Field label="Observaciones">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            Guardar turno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
