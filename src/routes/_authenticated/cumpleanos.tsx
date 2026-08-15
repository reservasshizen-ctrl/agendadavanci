import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { WaButton } from "@/components/WaButton";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs } from "@/routes/_authenticated/agenda";
import { useLogMessage, usePatients } from "@/lib/db";
import { age, birthdayMessage, daysToBirthday, formatShortDate, patientPhone } from "@/lib/sns";

export const Route = createFileRoute("/_authenticated/cumpleanos")({
  head: () => ({
    meta: [
      { title: "Cumpleaños | Centro SNS" },
      { name: "description", content: "Cumpleaños del día, de la semana y del mes para enviar saludos por WhatsApp." },
      { property: "og:title", content: "Cumpleaños | Centro SNS" },
      { property: "og:description", content: "Cumpleaños de pacientes de Centro SNS." },
    ],
  }),
  component: Cumpleanos,
});

function Cumpleanos() {
  const { data: patients = [] } = usePatients();
  const logMessage = useLogMessage();
  const [range, setRange] = useState("hoy");

  const limit = range === "hoy" ? 0 : range === "semana" ? 7 : 31;
  const list = patients
    .map((p) => ({ p, d: daysToBirthday(p.birth_date) }))
    .filter((x) => x.d !== null && x.d >= 0 && x.d <= limit)
    .sort((a, b) => (a.d ?? 0) - (b.d ?? 0));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cumpleaños</h1>
        <p className="text-sm text-muted-foreground">Saludos automáticos por WhatsApp</p>
      </header>

      <Tabs
        value={range}
        onChange={setRange}
        options={[
          ["hoy", "Hoy"],
          ["semana", "Próximos 7 días"],
          ["mes", "Próximos 31 días"],
        ]}
      />

      {list.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-muted-foreground">Sin cumpleaños en este rango.</div>
      ) : (
        <div className="surface divide-y divide-border">
          {list.map(({ p, d }) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-48 flex-1">
                <Link to="/pacientes/$id" params={{ id: p.id }} className="font-medium hover:underline">
                  {d === 0 ? "🎂 " : ""}
                  {p.full_name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {formatShortDate(p.birth_date)} · cumple {(age(p.birth_date) ?? 0) + (d === 0 ? 0 : 1)} años ·{" "}
                  {d === 0 ? "Hoy" : `En ${d} días`}
                </p>
              </div>
              <StatusBadge value={p.status} />
              <WaButton
                phone={patientPhone(p)}
                message={birthdayMessage(p.first_name)}
                onOpened={() => logMessage.mutate({ patientId: p.id, type: "birthday" })}
              >
                🎉 Felicitar
              </WaButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
