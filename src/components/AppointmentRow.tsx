import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { StatusBadge, SentBadge } from "@/components/StatusBadge";
import { WaButton } from "@/components/WaButton";
import { useMarkScheduleSent, useSetAttendance } from "@/lib/db";
import {
  APPOINTMENT_STATUSES,
  appointmentMessage,
  formatDate,
  formatTime,
  label,
  patientPhone,
  type AppointmentWithPatient,
} from "@/lib/sns";

export function AppointmentRow({ appt, showDate = false }: { appt: AppointmentWithPatient; showDate?: boolean }) {
  const markSent = useMarkScheduleSent();
  const setAttendance = useSetAttendance();
  const patient = appt.patient;

  return (
    <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="w-16 shrink-0">
          <p className="text-lg font-semibold tabular-nums">{formatTime(appt.time)}</p>
          {showDate && <p className="text-xs text-muted-foreground">{formatDate(appt.date)}</p>}
          <p className="text-xs text-muted-foreground">{appt.duration} min</p>
        </div>
        <div className="min-w-0">
          <Link
            to="/pacientes/$id"
            params={{ id: appt.patient_id }}
            className="block truncate font-medium hover:underline"
          >
            {patient?.full_name ?? "Paciente"}
          </Link>
          <p className="text-xs text-muted-foreground">
            {label(appt.appointment_type)}
            {appt.professional ? ` · ${appt.professional}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge value={appt.status} />
            <SentBadge sent={appt.schedule_sent} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={appt.status}
          onChange={async (e) => {
            const status = e.target.value;
            const reason =
              status.startsWith("falta") || status === "cancelo"
                ? (window.prompt("Observación / motivo (opcional):") ?? undefined)
                : undefined;
            await setAttendance.mutateAsync({ appointment: appt, status, ...(reason ? { reason } : {}) });
            toast.success(`Turno marcado como ${label(status)}`);
          }}
        >
          {APPOINTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>

        <WaButton
          phone={patientPhone(patient ?? { whatsapp: null, phone: null })}
          message={appointmentMessage(patient?.first_name ?? "", appt.date, appt.time)}
          onOpened={async () => {
            if (appt.schedule_sent) return;
            await markSent.mutateAsync(appt);
            toast.success("Registrado: horario enviado por WhatsApp");
          }}
        >
          {appt.schedule_sent ? "WhatsApp" : "Enviar horario"}
        </WaButton>
      </div>
    </div>
  );
}
