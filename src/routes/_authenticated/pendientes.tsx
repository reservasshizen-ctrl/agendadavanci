import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppointmentRow } from "@/components/AppointmentRow";
import { Tabs } from "@/routes/_authenticated/agenda";
import { useAppointments } from "@/lib/db";
import { addDaysISO, formatDate, todayISO } from "@/lib/sns";

export const Route = createFileRoute("/_authenticated/pendientes")({
  head: () => ({
    meta: [
      { title: "Pendientes de envío | Centro SNS" },
      { name: "description", content: "Turnos cuyo horario todavía no fue enviado al paciente por WhatsApp." },
      { property: "og:title", content: "Pendientes de envío | Centro SNS" },
      { property: "og:description", content: "Turnos sin horario enviado en Centro SNS." },
    ],
  }),
  component: Pendientes,
});

function Pendientes() {
  const today = todayISO();
  const [range, setRange] = useState("7");
  const { data: appts = [], isLoading } = useAppointments(today, addDaysISO(today, Number(range)));
  const pendientes = appts.filter((a) => !a.schedule_sent);

  const grouped = pendientes.reduce<Record<string, typeof pendientes>>((acc, a) => {
    (acc[a.date] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pendientes de envío</h1>
        <p className="text-sm text-muted-foreground">{pendientes.length} turnos sin horario enviado</p>
      </header>

      <Tabs
        value={range}
        onChange={setRange}
        options={[
          ["0", "Hoy"],
          ["1", "Hoy y mañana"],
          ["7", "Próximos 7 días"],
          ["30", "Próximos 30 días"],
        ]}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : pendientes.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-muted-foreground">
          Todos los horarios fueron enviados. 🎉
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{formatDate(date)}</h2>
              <div className="space-y-3">
                {items.map((a) => (
                  <AppointmentRow key={a.id} appt={a} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
