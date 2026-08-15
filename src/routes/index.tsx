import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Centro SNS | Agenda y gestión de pacientes" },
      {
        name: "description",
        content: "Sistema de agenda, pacientes, revisiones y recordatorios por WhatsApp del Centro SNS.",
      },
      { property: "og:title", content: "Centro SNS | Agenda y gestión de pacientes" },
      { property: "og:description", content: "Agenda, pacientes y recordatorios por WhatsApp del Centro SNS." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
