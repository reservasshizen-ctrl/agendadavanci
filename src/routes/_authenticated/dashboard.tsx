import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarPlus, Cake, Send, Stethoscope, CalendarDays, TriangleAlert } from "lucide-react";
import { AppointmentRow } from "@/components/AppointmentRow";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { WaButton } from "@/components/WaButton";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAppointments, useMarkReviewReminder, usePatients, useReviews, useLogMessage } from "@/lib/db";
import {
  addDaysISO,
  birthdayMessage,
  daysBetween,
  daysToBirthday,
  formatDate,
  formatShortDate,
  formatTime,
  patientPhone,
  reviewMessage,
  todayISO,
} from "@/lib/sns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Centro SNS" },
      { name: "description", content: "Resumen diario de turnos, revisiones, envíos y cumpleaños de Centro SNS." },
      { property: "og:title", content: "Dashboard | Centro SNS" },
      { property: "og:description", content: "Resumen diario de turnos, revisiones, envíos y cumpleaños." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const [openAppt, setOpenAppt] = useState(false);
  const { data: appts = [] } = useAppointments(today, addDaysISO(today, 30));
  const { data: patients = [] } = usePatients();
  const { data: reviews = [] } = useReviews();
  const reminder = useMarkReviewReminder();
  const logMessage = useLogMessage();

  const todays = appts.filter((a) => a.date === today);
  const tomorrows = appts.filter((a) => a.date === tomorrow);
  const upcoming = appts.filter((a) => a.date > tomorrow).slice(0, 6);
  const pending = todays.filter((a) => !a.schedule_sent);
  const sent = todays.filter((a) => a.schedule_sent);

  const upcomingReviews = reviews
    .filter((r) => r.status === "pendiente" && daysBetween(today, r.review_date) <= 7)
    .sort((a, b) => a.review_date.localeCompare(b.review_date));

  const birthdaysToday = patients.filter((p) => daysToBirthday(p.birth_date) === 0);
  const birthdaysSoon = patients
    .filter((p) => {
      const d = daysToBirthday(p.birth_date);
      return d !== null && d > 0 && d <= 7;
    })
    .sort((a, b) => (daysToBirthday(a.birth_date) ?? 0) - (daysToBirthday(b.birth_date) ?? 0));

  const abandonos = patients.filter((p) => p.status === "abandono");
  const faltas = patients.filter((p) => p.status.startsWith("falta"));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hoy en Centro SNS</h1>
          <p className="text-sm text-muted-foreground">{formatDate(today)}</p>
        </div>
        <Button onClick={() => setOpenAppt(true)}>
          <CalendarPlus className="mr-2 size-4" /> Agregar turno
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat icon={CalendarDays} label="Turnos de hoy" value={todays.length} to="/agenda" />
        <Stat icon={Send} label="Pendientes de envío" value={pending.length} tone="warning" to="/pendientes" />
        <Stat icon={Send} label="Enviados" value={sent.length} tone="success" to="/pendientes" />
        <Stat icon={Stethoscope} label="Revisiones próximas" value={upcomingReviews.length} tone="info" to="/revisiones" />
        <Stat icon={Cake} label="Cumpleaños" value={birthdaysToday.length + birthdaysSoon.length} to="/cumpleanos" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title={`Turnos de hoy (${todays.length})`} link="/agenda">
          {todays.length === 0 ? (
            <Empty text="No hay turnos agendados para hoy." />
          ) : (
            <div className="space-y-3">
              {todays.map((a) => (
                <AppointmentRow key={a.id} appt={a} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title={`Turnos de mañana (${tomorrows.length})`} link="/agenda">
          {tomorrows.length === 0 ? (
            <Empty text="Sin turnos para mañana." />
          ) : (
            <div className="space-y-3">
              {tomorrows.map((a) => (
                <AppointmentRow key={a.id} appt={a} />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Próximos turnos">
          {upcoming.length === 0 ? (
            <Empty text="Sin próximos turnos." />
          ) : (
            <div className="space-y-3">
              {upcoming.map((a) => (
                <AppointmentRow key={a.id} appt={a} showDate />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Revisiones próximas" link="/revisiones">
          {upcomingReviews.length === 0 ? (
            <Empty text="No hay revisiones en los próximos 7 días." />
          ) : (
            <ul className="divide-y divide-border">
              {upcomingReviews.map((r) => {
                const dias = daysBetween(today, r.review_date);
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link to="/pacientes/$id" params={{ id: r.patient_id }} className="font-medium hover:underline">
                        {r.patient?.full_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.review_date)} · {formatTime(r.review_time)} ·{" "}
                        {dias < 0 ? "Vencida" : dias === 0 ? "Hoy" : `En ${dias} días`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          dias < 0
                            ? "bg-danger-soft text-danger"
                            : r.reminder_sent
                              ? "bg-success-soft text-success"
                              : "bg-warning-soft text-warning-foreground"
                        }`}
                      >
                        {dias < 0 ? "Vencida" : r.reminder_sent ? "Recordatorio enviado" : "Recordatorio pendiente"}
                      </span>
                      <WaButton
                        phone={patientPhone(r.patient)}
                        message={reviewMessage(r.patient?.first_name ?? "", r.review_date, r.review_time)}
                        onOpened={() => reminder.mutate({ reviewId: r.id, patientId: r.patient_id })}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Cumpleaños" link="/cumpleanos">
          {birthdaysToday.length === 0 && birthdaysSoon.length === 0 ? (
            <Empty text="Sin cumpleaños en los próximos 7 días." />
          ) : (
            <ul className="divide-y divide-border">
              {birthdaysToday.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">🎂 {p.full_name}</p>
                    <p className="text-xs text-muted-foreground">Cumpleaños: Hoy</p>
                  </div>
                  <WaButton
                    phone={patientPhone(p)}
                    message={birthdayMessage(p.first_name)}
                    onOpened={() => logMessage.mutate({ patientId: p.id, type: "birthday" })}
                  >
                    🎉 Felicitar
                  </WaButton>
                </li>
              ))}
              {birthdaysSoon.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-3">
                  <div>
                    <p className="font-medium">{formatShortDate(p.birth_date)} — {p.full_name}</p>
                    <p className="text-xs text-muted-foreground">En {daysToBirthday(p.birth_date)} días</p>
                  </div>
                  <WaButton
                    phone={patientPhone(p)}
                    message={birthdayMessage(p.first_name)}
                    onOpened={() => logMessage.mutate({ patientId: p.id, type: "birthday" })}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Faltas y abandonos" link="/faltas">
          {faltas.length === 0 && abandonos.length === 0 ? (
            <Empty text="Sin registros." />
          ) : (
            <ul className="divide-y divide-border">
              {[...abandonos, ...faltas].slice(0, 10).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-3">
                  <Link to="/pacientes/$id" params={{ id: p.id }} className="font-medium hover:underline">
                    {p.full_name}
                  </Link>
                  <StatusBadge value={p.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <AppointmentDialog open={openAppt} onOpenChange={setOpenAppt} />
    </div>
  );
}

function Stat({
  icon: Icon,
  label: text,
  value,
  tone = "primary",
  to,
}: {
  icon: typeof Send;
  label: string;
  value: number;
  tone?: "primary" | "success" | "warning" | "info";
  to?: "/agenda" | "/pendientes" | "/revisiones" | "/cumpleanos";
}) {
  const toneMap = {
    primary: "bg-accent text-accent-foreground",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning-foreground",
    info: "bg-info-soft text-info",
  };
  const content = (
    <div className="surface flex items-center gap-3 p-4 transition-shadow hover:shadow-lg">
      <span className={`flex size-10 items-center justify-center rounded-xl ${toneMap[tone]}`}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function Panel({ title, link, children }: { title: string; link?: "/agenda" | "/revisiones" | "/cumpleanos" | "/faltas"; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
        {link && (
          <Link to={link} className="text-xs text-primary hover:underline">
            Ver todo
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="surface flex items-center gap-2 p-6 text-sm text-muted-foreground">
      <TriangleAlert className="size-4" /> {text}
    </div>
  );
}
