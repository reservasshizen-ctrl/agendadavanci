import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Centro SNS | Agenda y Portal del Paciente" },
      {
        name: "description",
        content: "Agenda, pacientes, revisiones y Portal del Paciente con turnos y novedades de Centro SNS.",
      },
      { property: "og:title", content: "Centro SNS | Agenda y Portal del Paciente" },
      { property: "og:description", content: "Agenda, pacientes y Portal del Paciente de Centro SNS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/acceso-paciente" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isStaff = (roles ?? []).some((r) => r.role === "admin" || r.role === "recepcion");
    throw redirect({ to: isStaff ? "/dashboard" : "/portal" });
  },
});
