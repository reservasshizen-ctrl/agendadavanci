import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BackupExport } from "@/components/BackupExport";
import { LegendEditor } from "@/components/LegendEditor";
import { supabase } from "@/integrations/supabase/client";
import { appointmentMessage, birthdayMessage, reviewMessage, todayISO } from "@/lib/sns";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración | Centro SNS" },
      { name: "description", content: "Cuenta y plantillas de mensajes de WhatsApp utilizadas por el sistema." },
      { property: "og:title", content: "Configuración | Centro SNS" },
      { property: "og:description", content: "Cuenta y plantillas de mensajes de Centro SNS." },
    ],
  }),
  component: Configuracion,
});

function Configuracion() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const templates: [string, string][] = [
    ["Confirmación de turno", appointmentMessage("María", todayISO(), "10:30")],
    ["Recordatorio de revisión", reviewMessage("María", todayISO(), "10:30")],
    ["Saludo de cumpleaños", birthdayMessage("María")],
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground">Cuenta y plantillas de mensajes</p>
      </header>

      <section className="surface p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase">Cuenta</h2>
        <p className="mt-2 text-sm">{email || "—"}</p>
      </section>

      <LegendEditor />

      <BackupExport />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase">Plantillas de WhatsApp</h2>
        {templates.map(([title, body]) => (
          <div key={title} className="surface p-4">
            <p className="mb-2 text-sm font-medium">{title}</p>
            <pre className="text-xs whitespace-pre-wrap text-muted-foreground">{body}</pre>
          </div>
        ))}
      </section>
    </div>
  );
}
