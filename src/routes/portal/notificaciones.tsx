import { createFileRoute } from "@tanstack/react-router";
import {
  formatDateTime,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMyNotifications,
  useMyPatient,
} from "@/lib/portal";
import { Bell, BellRing, CalendarClock, Megaphone } from "lucide-react";

export const Route = createFileRoute("/portal/notificaciones")({
  head: () => ({
    meta: [
      { title: "Mis avisos | Portal del Paciente Centro SNS" },
      { name: "description", content: "Recordatorios de turnos, cambios de horario y avisos de Centro SNS." },
      { property: "og:title", content: "Mis avisos | Portal del Paciente Centro SNS" },
      { property: "og:description", content: "Recordatorios y avisos personalizados de Centro SNS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notificaciones,
});

const iconFor = (type: string) => {
  if (type.includes("recordatorio")) return CalendarClock;
  if (type.includes("turno")) return BellRing;
  if (type.includes("novedad") || type.includes("aviso")) return Megaphone;
  return Bell;
};

function Notificaciones() {
  const { data: patient } = useMyPatient();
  const { data: items = [], isLoading } = useMyNotifications(patient?.id);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Avisos</h1>
        {unread > 0 && patient && (
          <button onClick={() => markAll.mutate(patient.id)} className="text-xs text-primary">
            Marcar todo como leído
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {!isLoading && items.length === 0 && (
        <p className="surface p-6 text-center text-sm text-muted-foreground">No tenés notificaciones por ahora.</p>
      )}

      <div className="space-y-2">
        {items.map((n) => {
          const Icon = iconFor(n.type);
          return (
            <button
              key={n.id}
              onClick={() => !n.is_read && markRead.mutate(n.id)}
              className={`surface flex w-full gap-3 p-4 text-left ${n.is_read ? "opacity-70" : ""}`}
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{n.title}</span>
                  {!n.is_read && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{n.message}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
