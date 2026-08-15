import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { WaButton } from "@/components/WaButton";
import { Tabs } from "@/routes/_authenticated/agenda";
import { useMarkReviewReminder, useReviews } from "@/lib/db";
import { daysBetween, formatDate, formatTime, patientPhone, reviewMessage, todayISO } from "@/lib/sns";

export const Route = createFileRoute("/_authenticated/revisiones")({
  head: () => ({
    meta: [
      { title: "Revisiones | Centro SNS" },
      { name: "description", content: "Control de revisiones programadas, recordatorios enviados y revisiones vencidas." },
      { property: "og:title", content: "Revisiones | Centro SNS" },
      { property: "og:description", content: "Control de revisiones programadas de Centro SNS." },
    ],
  }),
  component: Revisiones,
});

function Revisiones() {
  const today = todayISO();
  const { data: reviews = [], isLoading } = useReviews();
  const reminder = useMarkReviewReminder();
  const [filter, setFilter] = useState("proximas");

  const list = reviews.filter((r) => {
    const d = daysBetween(today, r.review_date);
    if (filter === "proximas") return r.status === "pendiente" && d >= 0 && d <= 30;
    if (filter === "vencidas") return r.status === "pendiente" && d < 0;
    if (filter === "sin_recordatorio") return r.status === "pendiente" && !r.reminder_sent;
    return true;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Revisiones</h1>
        <p className="text-sm text-muted-foreground">Seguimiento de controles programados</p>
      </header>

      <Tabs
        value={filter}
        onChange={setFilter}
        options={[
          ["proximas", "Próximas 30 días"],
          ["sin_recordatorio", "Sin recordatorio"],
          ["vencidas", "Vencidas"],
          ["todas", "Todas"],
        ]}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando revisiones...</p>
      ) : list.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-muted-foreground">Sin revisiones en esta vista.</div>
      ) : (
        <div className="surface divide-y divide-border">
          {list.map((r) => {
            const d = daysBetween(today, r.review_date);
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-48 flex-1">
                  <Link to="/pacientes/$id" params={{ id: r.patient_id }} className="font-medium hover:underline">
                    {r.patient?.full_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.review_date)} · {formatTime(r.review_time)} ·{" "}
                    {d < 0 ? `Vencida hace ${Math.abs(d)} días` : d === 0 ? "Hoy" : `En ${d} días`}
                    {r.professional ? ` · ${r.professional}` : ""}
                  </p>
                </div>
                <StatusBadge value={r.status} />
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    r.reminder_sent ? "bg-success-soft text-success" : "bg-warning-soft text-warning-foreground"
                  }`}
                >
                  {r.reminder_sent ? "Recordatorio enviado" : "Recordatorio pendiente"}
                </span>
                <WaButton
                  phone={patientPhone(r.patient)}
                  message={reviewMessage(r.patient?.first_name ?? "", r.review_date, r.review_time)}
                  onOpened={() => reminder.mutate({ reviewId: r.id, patientId: r.patient_id })}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
