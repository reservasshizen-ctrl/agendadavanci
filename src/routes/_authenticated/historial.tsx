import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMessages } from "@/lib/db";
import { matchPatient } from "@/lib/search";
import { formatDate, label } from "@/lib/sns";

export const Route = createFileRoute("/_authenticated/historial")({
  head: () => ({
    meta: [
      { title: "Historial de mensajes | Centro SNS" },
      { name: "description", content: "Registro de todos los mensajes de WhatsApp enviados a los pacientes." },
      { property: "og:title", content: "Historial de mensajes | Centro SNS" },
      { property: "og:description", content: "Registro de comunicaciones de Centro SNS." },
    ],
  }),
  component: Historial,
});

function Historial() {
  const { data: messages = [], isLoading } = useMessages();
  const [query, setQuery] = useState("");

  const list = messages.filter((m) => !query.trim() || (m.patient && matchPatient(m.patient, query)));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Historial de mensajes</h1>
        <p className="text-sm text-muted-foreground">{messages.length} envíos registrados</p>
      </header>

      <div className="relative">
        <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar paciente..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando historial...</p>
      ) : list.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-muted-foreground">Sin mensajes registrados.</div>
      ) : (
        <div className="surface divide-y divide-border">
          {list.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <div className="min-w-48 flex-1">
                {m.patient ? (
                  <Link to="/pacientes/$id" params={{ id: m.patient_id }} className="font-medium hover:underline">
                    {m.patient.full_name}
                  </Link>
                ) : (
                  <span className="font-medium">Paciente</span>
                )}
                <p className="text-xs text-muted-foreground">{label(m.message_type)}</p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(m.sent_at?.slice(0, 10))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
