import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { addDaysISO, todayISO, type Patient } from "@/lib/sns";
import { useSaveReview } from "@/lib/db";
import { Field } from "@/components/PatientDialog";

export function ReviewDialog({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient: Patient;
}) {
  const [date, setDate] = useState(addDaysISO(todayISO(), 30));
  const [time, setTime] = useState("09:00");
  const [professional, setProfessional] = useState("");
  const [notes, setNotes] = useState("");
  const save = useSaveReview();

  useEffect(() => {
    if (!open) return;
    setDate(addDaysISO(todayISO(), 30));
    setTime("09:00");
    setProfessional("");
    setNotes("");
  }, [open]);

  const submit = async () => {
    if (!date) {
      toast.error("Indicá la fecha de la revisión");
      return;
    }
    try {
      await save.mutateAsync({ patient, review_date: date, review_time: time, professional, notes });
      toast.success("Revisión registrada");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo registrar la revisión");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar revisión — {patient.full_name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de revisión">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Hora">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Profesional" className="col-span-2">
            <Input value={professional} onChange={(e) => setProfessional(e.target.value)} maxLength={100} />
          </Field>
          <Field label="Motivo / observación" className="col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            Guardar revisión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
