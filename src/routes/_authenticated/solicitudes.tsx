import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePatients, useReviewRequest } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/solicitudes")({
  head: () => ({
    meta: [
      { title: "Solicitudes de registro | Centro SNS" },
      { name: "description", content: "Pacientes registrados desde el portal que esperan revisión del personal." },
      { property: "og:title", content: "Solicitudes de registro | Centro SNS" },
      { property: "og:description", content: "Revisión de nuevos registros del Portal del Paciente." },
    ],
  }),
  component: Solicitudes,
});

function Solicitudes() {
  const { data = [] } = usePatients();
  const review = useReviewRequest();
  const pending = data.filter((p) => p.review_status === "pendiente" && !p.deleted_at);
  const docCount = (d: string | null) => (d ? data.filter((p) => p.document_number === d).length : 0);

  const act = async (id: string, approve: boolean) => {
    try {
      await review.mutateAsync({ id, approve });
      toast.success(approve ? "Paciente aprobado" : "Solicitud rechazada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Solicitudes de registro</h1>
        <p className="text-sm text-muted-foreground">Pacientes que se anotaron desde el portal y esperan revisión</p>
      </header>
      {pending.length === 0 ? (
        <p className="surface p-5 text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
      ) : (
        <ul className="space-y-2">
          {pending.map((p) => (
            <li key={p.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link to="/pacientes/$id" params={{ id: p.id }} className="font-medium hover:underline">
                  {p.first_name} {p.last_name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  CI {p.document_number ?? "—"} · Tel. {p.phone ?? "—"} · Nac. {p.birth_date ?? "—"}
                </p>
                {docCount(p.document_number) > 1 && (
                  <p className="text-xs font-medium text-warning">Posible duplicado: hay otra ficha con esta cédula.</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => act(p.id, false)}>Rechazar</Button>
                <Button size="sm" onClick={() => act(p.id, true)}>Aprobar</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
