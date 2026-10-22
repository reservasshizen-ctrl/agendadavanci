import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { APPOINTMENT_TYPES, formatTime, label, overlappingAppointments, todayISO, type Patient } from "@/lib/sns";
import { useAppointments, useSaveAppointment } from "@/lib/db";
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
  defaultDate?: string;
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
  const overlaps = overlappingAppointments(dayAppts, {
    time,
    duration: Number(duration) || 30,
    professional,
  });

  useEffect(() => {
    if (!open) return;
    setSelected(patient ?? null);
    setDate(defaultDate ?? todayISO());
    setTime("09:00");
    setDuration("30");
    setType("consulta");
    setProfessional("");
    setNotes("");
  }, [open, patient, defaultDate]);

  const submit = async () => {
    if (!selected) {
      toast.error("Seleccioná un paciente");
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
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Hora">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label="Duración (min)">
              <Input type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </Field>
            <Field label="Tipo de consulta">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {label(t)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
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
