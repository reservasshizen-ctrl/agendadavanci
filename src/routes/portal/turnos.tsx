import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { calendarLink, useMyAppointments, useMyPatient, useMyReviews } from "@/lib/portal";
import { CalendarPlus, CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/portal/turnos")({
  head: () => ({
    meta: [
      { title: "Mis turnos | Portal del Paciente Centro SNS" },
      { name: "description", content: "Consultá tus próximos turnos y el historial de consultas en Centro SNS." },
      { property: "og:title", content: "Mis turnos | Portal del Paciente Centro SNS" },
      { property: "og:description", content: "Próximos turnos e historial de consultas en Centro SNS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MisTurnos,
});

const fmt = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

function MisTurnos() {
  const [tab, setTab] = useState<"proximos" | "historial">("proximos");
  const { data: patient } = useMyPatient();
  const { data: appts = [], isLoading } = useMyAppointments(patient?.id);
  const { data: reviews = [] } = useMyReviews(patient?.id);

  const today = new Date().toISOString().slice(0, 10);
  const proximos = appts
    .filter((a) => a.date >= today && a.status !== "cancelado")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const historial = appts
    .filter((a) => a.date < today || a.status === "cancelado")
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const list = tab === "proximos" ? proximos : historial;

  const nextReview = reviews
    .filter((r) => r.review_date >= today && r.status !== "realizada")
    .sort((a, b) => a.review_date.localeCompare(b.review_date))[0];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Mis turnos</h1>

      {nextReview && (
        <div className="surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Próxima revisión</p>
          <p className="mt-1 text-sm">
            {fmt(nextReview.review_date)}
            {nextReview.review_time ? ` · ${nextReview.review_time.slice(0, 5)} hs` : ""}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
        {(["proximos", "historial"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-2 ${tab === t ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
          >
            {t === "proximos" ? "Próximos" : "Historial"}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {!isLoading && list.length === 0 && (
        <p className="surface p-6 text-center text-sm text-muted-foreground">
          {tab === "proximos" ? "No tenés turnos programados." : "Todavía no hay turnos anteriores."}
        </p>
      )}

      <div className="space-y-2">
        {list.map((a) => (
          <div key={a.id} className="surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {fmt(a.date)} · {a.time.slice(0, 5)} hs
                </p>
                <p className="text-sm text-muted-foreground">
                  {a.appointment_type}
                  {a.professional ? ` · ${a.professional}` : ""}
                </p>
                {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
              </div>
              <StatusChip status={a.status} />
            </div>
            {tab === "proximos" && (
              <a
                href={calendarLink({
                  title: `Turno en Centro SNS — ${a.appointment_type}`,
                  dateISO: a.date,
                  time: a.time,
                  details: a.professional ?? "",
                })}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary"
              >
                <CalendarPlus className="size-3.5" /> Agregar al calendario
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: typeof Clock }> = {
    pendiente: { label: "Pendiente", className: "bg-muted text-muted-foreground", icon: Clock },
    confirmado: { label: "Confirmado", className: "bg-primary/10 text-primary", icon: CheckCircle2 },
    asistio: { label: "Asistió", className: "bg-primary/10 text-primary", icon: CheckCircle2 },
    cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive", icon: XCircle },
  };
  const item = map[status] ?? { label: status, className: "bg-muted text-muted-foreground", icon: Clock };
  const Icon = item.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] ${item.className}`}>
      <Icon className="size-3" />
      {item.label}
    </span>
  );
}
