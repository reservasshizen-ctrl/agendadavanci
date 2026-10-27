import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSetAttendance } from "@/lib/db";
import { formatTime, type AppointmentWithPatient } from "@/lib/sns";

export function TodayChecklist({ appts }: { appts: AppointmentWithPatient[] }) {
  const attend = useSetAttendance();
  const sorted = [...appts].sort((a, b) => a.time.localeCompare(b.time));
  const done = sorted.filter((a) => a.status === "asistio").length;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Pacientes de hoy</h2>
        <span className="text-xs text-muted-foreground">{done} de {sorted.length} atendidos</span>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay pacientes para hoy.</p>
      ) : (
        <ul className="divide-y divide-border">
          {sorted.map((a) => {
            const ok = a.status === "asistio";
            return (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                <div className={ok ? "text-muted-foreground line-through" : ""}>
                  <span className="mr-2 font-mono text-sm">{formatTime(a.time)}</span>
                  <Link to="/pacientes/$id" params={{ id: a.patient_id }} className="font-medium hover:underline">
                    {a.patient?.full_name}
                  </Link>
                </div>
                {ok ? (
                  <span className="flex items-center gap-1 text-sm text-success"><CheckCircle2 className="size-4" /> Atendido</span>
                ) : (
                  <Button
                    size="sm"
                    disabled={attend.isPending}
                    onClick={() => attend.mutate({ appointment: a, status: "asistio" }, { onSuccess: () => toast.success("Paciente atendido") })}
                  >
                    <CheckCircle2 className="mr-1 size-4" /> Confirmar atendido
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type Note = { id: string; body: string; author_id: string; author_name: string | null; created_at: string };

export function ImportanceBoard() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: async () => (await supabase.auth.getUser()).data.user });
  const { data: notes = [] } = useQuery({
    queryKey: ["staff_notes"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_notes").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as Note[];
    },
  });
  const add = useMutation({
    mutationFn: async () => {
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", me!.id).maybeSingle();
      const { error } = await supabase.from("staff_notes").insert({ body: text.trim(), author_name: prof?.display_name || me?.email || null });
      if (error) throw error;
    },
    onSuccess: () => (setText(""), qc.invalidateQueries({ queryKey: ["staff_notes"] })),
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_notes"] }),
  });
  return (
    <div className="rounded-xl border-2 border-warning bg-warning-soft/40 p-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><Star className="size-4 text-warning" /> Importancia</h2>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) add.mutate();
        }}
      >
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Escribí una observación para el equipo…" className="flex-1 rounded-md border border-input bg-background p-2 text-sm" />
        <Button type="submit" disabled={!text.trim() || add.isPending}>Agregar</Button>
      </form>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay observaciones.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-md border border-border bg-card p-2">
              <p className="whitespace-pre-wrap text-sm">{n.body}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{n.author_name ?? "Personal"} · {new Date(n.created_at).toLocaleString("es-PY", { dateStyle: "short", timeStyle: "short" })}</span>
                {n.author_id === me?.id && (
                  <button type="button" aria-label="Borrar" onClick={() => del.mutate(n.id)}><Trash2 className="size-3.5" /></button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
