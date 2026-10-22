import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/PatientDialog";
import { useAppointments, usePatients } from "@/lib/db";
import { formatGs, useSales, useSessions, useTreatments } from "@/lib/clinical";
import { addDaysISO, todayISO, type Patient } from "@/lib/sns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/indicadores")({
  head: () => ({
    meta: [
      { title: "Seguimiento e indicadores | Centro SNS" },
      { name: "description", content: "Seguimiento de pacientes e indicadores por período." },
      { property: "og:title", content: "Seguimiento e indicadores | Centro SNS" },
      { property: "og:description", content: "Indicadores de pacientes, turnos, sesiones y ventas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IndicatorsPage,
});

type Segment = "nuevos" | "tratamiento" | "finalizado" | "seguimiento";

function IndicatorsPage() {
  const [from, setFrom] = useState(addDaysISO(todayISO(), -30));
  const [to, setTo] = useState(todayISO());
  const [segment, setSegment] = useState<Segment>("seguimiento");
  const { data: patients = [] } = usePatients();
  const { data: appts = [] } = useAppointments(from, to);
  const { data: treatments = [] } = useTreatments();
  const { data: sessions = [] } = useSessions();
  const { data: sales = [] } = useSales();

  const inRange = (iso?: string | null) => Boolean(iso) && iso!.slice(0, 10) >= from && iso!.slice(0, 10) <= to;
  const today = todayISO();
  const live = patients.filter((p) => !p.deleted_at && !p.archived);

  const ongoing = new Set(treatments.filter((t) => t.status === "en_curso").map((t) => t.patient_id));
  const finishedOnly = new Set(
    treatments
      .filter((t) => t.status === "finalizado")
      .map((t) => t.patient_id)
      .filter((id) => !ongoing.has(id)),
  );
  const followUp = (p: Patient) =>
    p.status === "pendiente_revision" ||
    p.status === "en_revision" ||
    (p.next_review_date !== null && p.next_review_date <= today);

  const segments: Record<Segment, { label: string; list: Patient[] }> = {
    nuevos: { label: "Nuevos en el período", list: live.filter((p) => inRange(p.created_at)) },
    tratamiento: { label: "En tratamiento", list: live.filter((p) => ongoing.has(p.id)) },
    finalizado: { label: "Tratamiento finalizado", list: live.filter((p) => finishedOnly.has(p.id)) },
    seguimiento: { label: "Pendientes de seguimiento", list: live.filter(followUp) },
  };

  const salesIn = sales.filter((s) => inRange(s.sale_date));
  const salesTotal = salesIn.reduce((s, x) => s + x.total, 0);
  const margin = salesIn.reduce((s, x) => s + x.total - x.cost_total, 0);

  const kpis: [string, string | number, string][] = [
    ["Pacientes nuevos", segments.nuevos.list.length, "Fichas creadas dentro del período."],
    ["Turnos agendados", appts.length, "Turnos con fecha dentro del período, en cualquier estado. No son ingresos."],
    ["Turnos atendidos", appts.filter((a) => a.status === "asistio").length, "Turnos marcados como “Asistió”."],
    ["Cancelaciones", appts.filter((a) => a.status === "cancelo").length, "Turnos marcados como “Canceló”."],
    [
      "Ausencias",
      appts.filter((a) => a.status.startsWith("falta")).length,
      "Turnos marcados como falta (con o sin causa).",
    ],
    ["Sesiones realizadas", sessions.filter((s) => inRange(s.session_date)).length, "Sesiones con fecha dentro del período."],
    [
      "Tratamientos terminados",
      treatments.filter((t) => t.status === "finalizado" && inRange(t.updated_at)).length,
      "Tratamientos en estado Finalizado cuya última modificación cae en el período.",
    ],
    ["Pendientes de seguimiento", segments.seguimiento.list.length, "Hoy: en revisión, pendiente de revisión o con revisión vencida."],
    ["Ventas de artículos", formatGs(salesTotal), "Suma de ventas registradas en el período."],
    ["Margen bruto estimado", formatGs(margin), "Ventas menos el costo unitario guardado al momento de cada venta."],
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Seguimiento e indicadores</h1>
          <p className="text-sm text-muted-foreground">El registro de cobros de consultas y sesiones todavía no está definido.</p>
        </div>
        <div className="flex gap-2">
          <Field label="Desde">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Hasta">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map(([l, v, how]) => (
          <div key={l} className="surface p-4" title={how}>
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-2xl font-semibold">{v}</p>
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{how}</p>
          </div>
        ))}
      </div>

      <section className="surface space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(segments) as Segment[]).map((k) => (
            <button
              key={k}
              onClick={() => setSegment(k)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                segment === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              {segments[k].label} ({segments[k].list.length})
            </button>
          ))}
        </div>
        <div className="divide-y divide-border">
          {segments[segment].list.length === 0 && <p className="py-3 text-sm text-muted-foreground">Sin pacientes.</p>}
          {segments[segment].list.map((p) => (
            <Link key={p.id} to="/pacientes/$id" params={{ id: p.id }} className="block py-2 text-sm hover:text-primary">
              {p.full_name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
