import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  Cake,
  Gauge,
  History,
  LogOut,
  Menu,
  Send,
  Settings,
  Stethoscope,
  TriangleAlert,
  Users,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isStaff = (roles ?? []).some((r) => r.role === "admin" || r.role === "recepcion");
    if (!isStaff) throw redirect({ to: "/portal" });
    return { user: data.user };
  },
  component: Shell,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/revisiones", label: "Revisiones", icon: Stethoscope },
  { to: "/cumpleanos", label: "Cumpleaños", icon: Cake },
  { to: "/pendientes", label: "Pendientes de envío", icon: Send },
  { to: "/faltas", label: "Faltas / Abandonos", icon: TriangleAlert },
  { to: "/contenido", label: "Contenido del portal", icon: Newspaper },
  { to: "/notificar", label: "Enviar notificaciones", icon: Bell },
  { to: "/historial", label: "Historial", icon: History },
  { to: "/configuracion", label: "Configuración", icon: Settings },
] as const;

function Shell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Topbar móvil */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="size-4" />
          </div>
          <span className="font-semibold">Centro SNS</span>
        </div>
        <button onClick={() => setOpen((v) => !v)} aria-label="Menú">
          <Menu className="size-5" />
        </button>
      </header>

      <aside
        className={cn(
          "z-20 w-full shrink-0 bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:w-64",
          open ? "block" : "hidden lg:block",
        )}
      >
        <div className="hidden items-center gap-2 px-5 py-5 lg:flex">
          <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <HeartPulse className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Centro SNS</p>
            <p className="text-xs text-sidebar-foreground/60">Agenda y pacientes</p>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-3">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
          <button
            onClick={signOut}
            className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
