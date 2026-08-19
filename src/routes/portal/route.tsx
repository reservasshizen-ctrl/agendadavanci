import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CalendarDays, Home, Newspaper, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/portal")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/acceso-paciente" });
    const { data: account } = await supabase
      .from("patient_accounts")
      .select("id, patient_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!account) throw redirect({ to: "/acceso-paciente" });
    return { user: data.user, patientId: account.patient_id };
  },
  component: PortalShell,
});

const tabs = [
  { to: "/portal", label: "Inicio", icon: Home, exact: true },
  { to: "/portal/turnos", label: "Turnos", icon: CalendarDays },
  { to: "/portal/novedades", label: "Novedades", icon: Newspaper },
  { to: "/portal/notificaciones", label: "Avisos", icon: Bell },
  { to: "/portal/cuenta", label: "Mi cuenta", icon: User },
] as const;

function PortalShell() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/acceso-paciente", replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="mx-auto w-full max-w-lg px-4 py-5">
        <Outlet />
        <button
          onClick={signOut}
          className="mt-10 w-full rounded-lg border border-border py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Cerrar sesión
        </button>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: "exact" in t ? t.exact : false }}
              activeProps={{ className: "text-primary" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
            >
              <t.icon className="size-5" />
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
