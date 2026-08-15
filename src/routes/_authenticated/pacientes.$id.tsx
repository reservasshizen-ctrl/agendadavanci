import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CalendarPlus, Pencil, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { WaButton } from "@/components/WaButton";
import { PatientDialog } from "@/components/PatientDialog";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { ReviewDialog } from "@/components/ReviewDialog";
import { useChangePatientStatus, useLogMessage, usePatient, usePatientTimeline } from "@/lib/db";
import {
  PATIENT_STATUSES,
  age,
  birthdayMessage,
  formatDate,
  formatShortDate,
  formatTime,
  label,
  patientPhone,
} from "@/lib/sns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pacientes/$id")({
  head: () => ({
    meta: [
      { title: "Ficha de paciente | Centro SNS" },
      { name: "description", content: "Ficha completa del paciente: datos, turnos, revisiones e historial." },
      { property: "og:title", content: "Ficha de paciente | Centro SNS" },
      { property: "og:description", content: "Ficha completa del paciente en Centro SNS." },
    ],
  }),
  component: PatientDetail,
});

function PatientDetail() {
  const { id } = Route.useParams();
  const { data: patient, isLoading } = usePatient(id);
  const { data: timeline } = usePatientTimeline(id);
  const changeStatus = useChangePatientStatus();
  const logMessage = useLogMessage();
  const [editing, setEditing] = useState(false);
  const [appt, setAppt] = useState(false);
  const [review, setReview] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando ficha...</p>;
  if (!patient) return <p className="text-sm text-muted-foreground">Paciente no encontrado.</p>;

  return (
    <div className="space-y-6">
      <Link to="/pacientes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver a pacientes
      </Link>

      <header className="surface flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{patient.full_name}</h1>
            <StatusBadge value={patient.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {patient.document_number ? `Documento ${patient.document_number} · ` : ""}
            {patient.birth_date ? `${formatDate(patient.birth_date)} (${age(patient.birth_date)} años)` : "Sin fecha de nacimiento"}
          </p>
          <p className="text-sm text-muted-foreground">
            Tel: {patient.phone || "—"} · WhatsApp: {patient.whatsapp || "—"}
          </p>
          {patient.address && <p className="text-sm text-muted-foreground">{patient.address}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <WaButton
            phone={patientPhone(patient)}
            message={birthdayMessage(patient.first_name)}
            size="md"
            onOpened={() => logMessage.mutate({ patientId: patient.id, type: "general" })}
          />
          <Button variant="outline" onClick={() => setAppt(true)}>
            <CalendarPlus className="mr-2 size-4" /> Turno
          </Button>
          <Button variant="outline" onClick={() => setReview(true)}>
            <Stethoscope className="mr-2 size-4" /> Revisión
          </Button>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 size-4" /> Editar
          </Button>
        </div>
      </header>

      <section className="surface space-y-3 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase">Cambiar estado</h2>
        <div className="flex flex-wrap gap-1.5">
          {PATIENT_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => changeStatus.mutate({ patient, newStatus: s, reason: "Cambio manual" })}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                patient.status === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {label(s)}
            </button>
          ))}
        </div>
        {patient.notes && <p className="text-sm text-muted-foreground">Notas: {patient.notes}</p>}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={`Turnos (${timeline?.appointments.length ?? 0})`}>
          {(timeline?.appointments ?? []).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span>
                {formatShortDate(a.date)} · {formatTime(a.time)} · {label(a.appointment_type)}
              </span>
              <StatusBadge value={a.status} />
            </li>
          ))}
        </Card>

        <Card title={`Revisiones (${timeline?.reviews.length ?? 0})`}>
          {(timeline?.reviews ?? []).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span>
                {formatShortDate(r.review_date)} · {formatTime(r.review_time)}
              </span>
              <StatusBadge value={r.status} />
            </li>
          ))}
        </Card>

        <Card title={`Mensajes enviados (${timeline?.messages.length ?? 0})`}>
          {(timeline?.messages ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span>{label(m.message_type)}</span>
              <span className="text-xs text-muted-foreground">{formatShortDate(m.sent_at?.slice(0, 10))}</span>
            </li>
          ))}
        </Card>

        <Card title={`Historial de estados (${timeline?.history.length ?? 0})`}>
          {(timeline?.history ?? []).map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span>
                {label(h.previous_status)} → {label(h.new_status)}
              </span>
              <span className="text-xs text-muted-foreground">{formatShortDate(h.created_at?.slice(0, 10))}</span>
            </li>
          ))}
        </Card>
      </div>

      <PatientDialog open={editing} onOpenChange={setEditing} patient={patient} />
      <AppointmentDialog open={appt} onOpenChange={setAppt} patient={patient} />
      <ReviewDialog open={review} onOpenChange={setReview} patient={patient} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const empty = !children || (Array.isArray(children) && children.length === 0);
  return (
    <div className="surface p-4">
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase">{title}</h2>
      {empty ? (
        <p className="text-sm text-muted-foreground">Sin registros.</p>
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
    </div>
  );
}
