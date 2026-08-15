import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { WaButton } from "@/components/WaButton";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/routes/_authenticated/agenda";
import { useChangePatientStatus, useLogMessage, usePatients } from "@/lib/db";
import { patientPhone, reviewMessage, todayISO, addDaysISO, formatShortDate } from "@/lib/sns";

export const Route = createFileRoute("/_authenticated/faltas")({
  head: () => ({
    meta: [
      { title: "Faltas y abandonos | Centro SNS" },
      { name: "description", content: "Pacientes con inasistencias o tratamientos abandonados para recuperar." },
      { property: "og:title", content: "Faltas y abandonos | Centro SNS" },
      { property: "og:description", content: "Control de faltas y abandonos en Centro SNS." },
    ],
  }),
  component: Faltas,
});

function Faltas() {
  const { data: patients = [] } = usePatients();
  const changeStatus = useChangePatientStatus();
  const logMessage = useLogMessage();
  const [filter, setFilter] = useState("faltas");

  const list = patients.filter((p) =>
    filter === "faltas" ? p.status.startsWith("falta") : p.status === "abandono",
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Faltas y abandonos</h1>
        <p className="text-sm text-muted-foreground">Pacientes a recuperar</p>
      </header>

      <Tabs
        value={filter}
        onChange={setFilter}
        options={[
          ["faltas", "Faltas"],
          ["abandonos", "Abandonos"],
        ]}
      />

      {list.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-muted-foreground">Sin pacientes en esta lista.</div>
      ) : (
        <div className="surface divide-y divide-border">
          {list.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-48 flex-1">
                <Link to="/pacientes/$id" params={{ id: p.id }} className="font-medium hover:underline">
                  {p.full_name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {p.abandonment_date ? `Desde ${formatShortDate(p.abandonment_date)} · ` : ""}
                  {p.abandonment_reason || "Sin motivo registrado"}
                </p>
              </div>
              <StatusBadge value={p.status} />
              <WaButton
                phone={patientPhone(p)}
                message={reviewMessage(p.first_name, addDaysISO(todayISO(), 7), "10:00")}
                onOpened={() => logMessage.mutate({ patientId: p.id, type: "recuperacion" })}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => changeStatus.mutate({ patient: p, newStatus: "activo", reason: "Paciente recuperado" })}
              >
                Reactivar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
