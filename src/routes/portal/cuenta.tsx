import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { registerPushDevice, useMyPatient, useUpdateMyPatient } from "@/lib/portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BellRing } from "lucide-react";

export const Route = createFileRoute("/portal/cuenta")({
  head: () => ({
    meta: [
      { title: "Mi cuenta | Portal del Paciente Centro SNS" },
      { name: "description", content: "Actualizá tus datos personales y activá las notificaciones de Centro SNS." },
      { property: "og:title", content: "Mi cuenta | Portal del Paciente Centro SNS" },
      { property: "og:description", content: "Datos personales y notificaciones del Portal del Paciente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cuenta,
});

function Cuenta() {
  const { data: patient } = useMyPatient();
  const update = useUpdateMyPatient();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    birth_date: "",
    address: "",
    city: "",
    notes: "",
  });

  useEffect(() => {
    if (!patient) return;
    setForm({
      first_name: patient.first_name ?? "",
      last_name: patient.last_name ?? "",
      phone: patient.phone ?? "",
      whatsapp: patient.whatsapp ?? "",
      email: (patient as { email?: string | null }).email ?? "",
      birth_date: patient.birth_date ?? "",
      address: patient.address ?? "",
      city: (patient as { city?: string | null }).city ?? "",
      notes: patient.notes ?? "",
    });
  }, [patient]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("Nombre y apellido son obligatorios.");
      return;
    }
    try {
      await update.mutateAsync({
        id: patient.id,
        values: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim() || null,
          whatsapp: form.whatsapp.trim() || null,
          birth_date: form.birth_date || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
          ...(({ email: form.email.trim() || null, city: form.city.trim() || null }) as object),
        } as never,
      });
      toast.success("Datos actualizados.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos guardar tus datos");
    }
  };

  const activarPush = async () => {
    if (!patient) return;
    const result = await registerPushDevice(patient.id);
    if (result.ok) toast.success("Notificaciones activadas en este dispositivo.");
    else if (result.reason === "denied") toast.error("Permiso de notificaciones rechazado.");
    else if (result.reason === "unsupported") toast.error("Tu navegador no admite notificaciones.");
    else toast.error("No pudimos activar las notificaciones.");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Mi cuenta</h1>

      <button onClick={activarPush} className="surface flex w-full items-center gap-3 p-4 text-left">
        <BellRing className="size-4 text-primary" />
        <span className="flex-1 text-sm">Activar notificaciones en este dispositivo</span>
      </button>

      <form onSubmit={save} className="surface space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre">
            <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} maxLength={60} />
          </Field>
          <Field label="Apellido">
            <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} maxLength={60} />
          </Field>
        </div>
        <Field label="Cédula">
          <Input value={patient?.document_number ?? ""} disabled />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={25} inputMode="tel" />
          </Field>
          <Field label="WhatsApp">
            <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} maxLength={25} inputMode="tel" />
          </Field>
        </div>
        <Field label="Correo electrónico">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={255} />
        </Field>
        <Field label="Fecha de nacimiento">
          <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
        </Field>
        <Field label="Dirección">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={160} />
        </Field>
        <Field label="Ciudad">
          <Input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={80} />
        </Field>
        <Field label="Observaciones">
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} rows={3} />
        </Field>
        <Button type="submit" className="w-full" disabled={update.isPending}>
          Guardar cambios
        </Button>
      </form>

      <p className="text-center text-[11px] text-muted-foreground">
        Tus datos son privados y solo los ve el equipo de Centro SNS.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
