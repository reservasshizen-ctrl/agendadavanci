import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSendNotification, type NotificationAudience } from "@/lib/portal";
import { usePatients } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { matchPatient } from "@/lib/search";

export const Route = createFileRoute("/_authenticated/notificar")({
  head: () => ({
    meta: [
      { title: "Enviar notificaciones | Centro SNS" },
      { name: "description", content: "Enviá avisos y recordatorios al Portal del Paciente de Centro SNS." },
      { property: "og:title", content: "Enviar notificaciones | Centro SNS" },
      { property: "og:description", content: "Avisos personalizados o masivos para los pacientes del portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificarPage,
});

const AUDIENCES: { value: NotificationAudience; label: string }[] = [
  { value: "todos", label: "Todos los pacientes" },
  { value: "activos", label: "Pacientes activos" },
  { value: "en_revision", label: "Pacientes en revisión" },
  { value: "seleccionados", label: "Pacientes seleccionados" },
];

function NotificarPage() {
  const send = useSendNotification();
  const { data: patients = [] } = usePatients();
  const [audience, setAudience] = useState<NotificationAudience>("todos");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const results = query.trim() ? patients.filter((p) => matchPatient(p, query)).slice(0, 20) : [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Completá el título y el mensaje.");
      return;
    }
    try {
      const count = await send.mutateAsync({
        audience,
        patientIds: selected,
        title: title.trim(),
        message: message.trim(),
        imageUrl: imageUrl.trim() || null,
      });
      toast.success(`Notificación enviada a ${count} paciente(s).`);
      setTitle("");
      setMessage("");
      setImageUrl("");
      setSelected([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar");
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Enviar notificaciones</h1>
        <p className="text-sm text-muted-foreground">Los pacientes las verán en el portal, en la sección Avisos.</p>
      </div>

      <form onSubmit={submit} className="surface space-y-4 p-5">
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Destinatarios</Label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as NotificationAudience)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {audience === "seleccionados" && (
          <div className="space-y-2">
            <Input placeholder="Buscar paciente…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="space-y-1">
              {results.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={selected.includes(p.id)}
                    onChange={(e) =>
                      setSelected((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))
                    }
                  />
                  {p.first_name} {p.last_name}
                </label>
              ))}
            </div>
            {selected.length > 0 && (
              <p className="text-xs text-muted-foreground">{selected.length} paciente(s) seleccionado(s).</p>
            )}
          </div>
        )}

        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Mensaje</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={1000} />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Imagen (URL, opcional)</Label>
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        </div>
        <Button type="submit" disabled={send.isPending}>
          Enviar notificación
        </Button>
      </form>
    </div>
  );
}
