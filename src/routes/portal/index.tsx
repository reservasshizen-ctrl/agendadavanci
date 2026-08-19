import { createFileRoute, Link } from "@tanstack/react-router";
import { useMyAppointments, useMyNotifications, useMyPatient, usePublishedContent } from "@/lib/portal";
import { Bell, CalendarDays, ChevronRight, Newspaper, Video } from "lucide-react";

export const Route = createFileRoute("/portal/")({
  head: () => ({
    meta: [
      { title: "Mi inicio | Portal del Paciente Centro SNS" },
      { name: "description", content: "Tu próximo turno, avisos y novedades de Centro SNS en un solo lugar." },
      { property: "og:title", content: "Mi inicio | Portal del Paciente Centro SNS" },
      { property: "og:description", content: "Tu próximo turno, avisos y novedades de Centro SNS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalHome,
});

function PortalHome() {
  const { data: patient } = useMyPatient();
  const { data: appts = [] } = useMyAppointments(patient?.id);
  const { data: notifications = [] } = useMyNotifications(patient?.id);
  const { data: content = [] } = usePublishedContent();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = [...appts]
    .filter((a) => a.date >= today && a.status !== "cancelado")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const next = upcoming[0];
  const unread = notifications.filter((n) => !n.is_read).length;
  const attended = appts.filter((a) => a.status === "asistio").length;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted-foreground">Hola,</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {patient?.first_name} {patient?.last_name}
        </h1>
      </header>

      <section className="surface p-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <CalendarDays className="size-3.5" /> Próximo turno
        </p>
        {next ? (
          <div>
            <p className="text-lg font-semibold">
              {formatDate(next.date)} · {next.time.slice(0, 5)} hs
            </p>
            <p className="text-sm text-muted-foreground">
              {next.appointment_type}
              {next.professional ? ` · ${next.professional}` : ""}
            </p>
            <Link to="/portal/turnos" className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
              Ver mis turnos <ChevronRight className="size-4" />
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tenés turnos programados por el momento.</p>
        )}
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Turnos" value={appts.length} />
        <Stat label="Asistidos" value={attended} />
        <Stat label="Sin leer" value={unread} />
      </section>

      <section className="space-y-2">
        <Shortcut to="/portal/notificaciones" icon={Bell} label="Mis notificaciones" badge={unread} />
        <Shortcut to="/portal/novedades" icon={Newspaper} label="Novedades de Centro SNS" />
        <Shortcut to="/portal/videos" icon={Video} label="Videos" />
      </section>

      {content.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium">Últimas publicaciones</h2>
          <div className="space-y-2">
            {content.slice(0, 3).map((c) => (
              <Link
                key={c.id}
                to="/portal/novedades"
                className="surface flex items-center gap-3 p-3"
              >
                {c.image_url ? (
                  <img src={c.image_url} alt={c.title} className="size-12 rounded-lg object-cover" loading="lazy" />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                    <Newspaper className="size-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface p-3 text-center">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Shortcut({
  to,
  icon: Icon,
  label,
  badge,
}: {
  to: "/portal/notificaciones" | "/portal/novedades" | "/portal/videos";
  icon: typeof Bell;
  label: string;
  badge?: number;
}) {
  return (
    <Link to={to} className="surface flex items-center gap-3 p-3">
      <Icon className="size-4 text-primary" />
      <span className="flex-1 text-sm">{label}</span>
      {badge ? (
        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">{badge}</span>
      ) : null}
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
