import { createFileRoute } from "@tanstack/react-router";

// Endpoint para generar los recordatorios automáticos de turnos.
// Se puede llamar una vez por día desde un programador externo.
export const Route = createFileRoute("/api/public/recordatorios")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (secret) {
          const provided = request.headers.get("x-cron-secret") ?? "";
          if (provided !== secret) return new Response("No autorizado", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("generate_appointment_reminders");
        if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
        return new Response(JSON.stringify({ ok: true, created: data ?? 0 }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
    },
  },
});
