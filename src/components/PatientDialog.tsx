import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { z } from "zod";
import { PATIENT_STATUSES, label, normalizePhone, type Patient } from "@/lib/sns";
import { usePatients, useSavePatient } from "@/lib/db";
import { Link } from "@tanstack/react-router";

const schema = z.object({
  first_name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  last_name: z.string().trim().min(1, "El apellido es obligatorio").max(80),
  document_number: z.string().trim().max(30).optional(),
  birth_date: z.string().optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  email: z.string().trim().max(255).optional(),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  first_consultation_date: z.string().optional(),
  status: z.string(),
  notes: z.string().trim().max(2000).optional(),
});

const empty = {
  first_name: "",
  last_name: "",
  document_number: "",
  birth_date: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  city: "",
  first_consultation_date: "",
  status: "activo",
  notes: "",
};

export function PatientDialog({
  open,
  onOpenChange,
  patient,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient?: Patient | null;
}) {
  const [form, setForm] = useState(empty);
  const [duplicate, setDuplicate] = useState<Patient | null>(null);
  const save = useSavePatient();
  const { data: patients = [] } = usePatients();

  useEffect(() => {
    if (!open) return;
    setDuplicate(null);
    setForm(
      patient
        ? {
            first_name: patient.first_name,
            last_name: patient.last_name,
            document_number: patient.document_number ?? "",
            birth_date: patient.birth_date ?? "",
            phone: patient.phone ?? "",
            whatsapp: patient.whatsapp ?? "",
            email: patient.email ?? "",
            address: patient.address ?? "",
            city: patient.city ?? "",
            first_consultation_date: patient.first_consultation_date ?? "",
            status: patient.status,
            notes: patient.notes ?? "",
          }
        : empty,
    );
  }, [open, patient]);

  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    const doc = form.document_number.trim();
    const wa = normalizePhone(form.whatsapp || form.phone);
    const dup = patients.find(
      (p) =>
        p.id !== patient?.id &&
        ((doc && p.document_number === doc) ||
          (wa && normalizePhone(p.whatsapp || p.phone) === wa)),
    );
    if (dup && !patient) {
      setDuplicate(dup);
      return;
    }
    try {
      await save.mutateAsync({
        id: patient?.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        document_number: doc || null,
        birth_date: form.birth_date || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        first_consultation_date: form.first_consultation_date || null,
        status: form.status,
        notes: form.notes.trim() || null,
      });
      toast.success(patient ? "Paciente actualizado" : "Paciente registrado");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{patient ? "Editar paciente" : "Nuevo paciente"}</DialogTitle>
        </DialogHeader>

        {duplicate && (
          <div className="rounded-lg border border-warning bg-warning-soft p-3 text-sm text-warning-foreground">
            <p className="font-medium">Este paciente ya existe en el sistema.</p>
            <p className="mt-1">
              {duplicate.full_name} — {duplicate.document_number ?? "sin cédula"}
            </p>
            <div className="mt-2 flex gap-2">
              <Link to="/pacientes/$id" params={{ id: duplicate.id }} onClick={() => onOpenChange(false)}>
                <Button size="sm" variant="secondary">
                  Abrir paciente existente
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => setDuplicate(null)}>
                Revisar datos
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre *">
            <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} maxLength={80} />
          </Field>
          <Field label="Apellido *">
            <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} maxLength={80} />
          </Field>
          <Field label="Número de cédula">
            <Input value={form.document_number} onChange={(e) => set("document_number", e.target.value)} maxLength={30} />
          </Field>
          <Field label="Fecha de nacimiento">
            <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
          </Field>
          <Field label="Teléfono">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0981123456" maxLength={30} />
          </Field>
          <Field label="WhatsApp">
            <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="0981123456" maxLength={30} />
          </Field>
          <Field label="Correo electrónico">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={255} />
          </Field>
          <Field label="Ciudad">
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={80} />
          </Field>
          <Field label="Dirección" className="sm:col-span-2">
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={200} />
          </Field>
          <Field label="Fecha de primera consulta">
            <Input
              type="date"
              value={form.first_consultation_date}
              onChange={(e) => set("first_consultation_date", e.target.value)}
            />
          </Field>
          <Field label="Estado">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {PATIENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Observaciones" className="sm:col-span-2">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} maxLength={2000} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {patient ? "Guardar cambios" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Field({
  label: text,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{text}</Label>
      {children}
    </div>
  );
}
