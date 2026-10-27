import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/actividad")({
  head: () => ({
    meta: [
      { title: "Actividad del personal | Centro SNS" },
      { name: "description", content: "Historial de lo que hace cada usuario del personal de Centro SNS." },
      { property: "og:title", content: "Actividad del personal | Centro SNS" },
      { property: "og:description", content: "Historial de acciones por usuario." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActividadPage,
});

const ENTITY: Record<string, string> = {
  patients: "paciente", appointments: "turno", fichas: "ficha", reviews: "revisión", attendance: "asistencia",
  sales: "venta", staff_notes: "observación de Importancia", products: "artículo", content: "contenido del portal", notifications: "notificación",
};
const ACTION: Record<string, string> = { insert: "Creó", update: "Modificó", delete: "Eliminó" };

type Row = { id: string; user_id: string | null; action: string; entity: string | null; created_at: string; details: { user_name?: string; patient_id?: string; patient_name?: string } | null };

function ActividadPage() {
  const [who, setWho] = useState("");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_activity_log").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as unknown as Row[];
    },
  });
  const users = [...new Set(rows.map((r) => r.details?.user_name ?? "Personal"))].sort();
  const shown = who ? rows.filter((r) => (r.details?.user_name ?? "Personal") === who) : rows;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Actividad del personal</h1>
        <p className="text-sm text-muted-foreground">Lo que hizo cada usuario en el sistema (últimas 500 acciones).</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {["", ...users].map((u) => (
          <button key={u || "all"} onClick={() => setWho(u)} className={`rounded-full border px-3 py-1 text-sm ${who === u ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
            {u || "Todos"}
          </button>
        ))}
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando…</p> : shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay actividad registrada.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
              <span>
                <b>{r.details?.user_name ?? "Personal"}</b> · {ACTION[r.action] ?? r.action} {ENTITY[r.entity ?? ""] ?? r.entity}
                {r.details?.patient_name && r.details.patient_id && (
                  <> de <Link to="/pacientes/$id" params={{ id: r.details.patient_id }} className="underline">{r.details.patient_name}</Link></>
                )}
              </span>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
