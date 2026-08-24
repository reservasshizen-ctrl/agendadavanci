import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { WaButton } from "@/components/WaButton";
import { PatientDialog } from "@/components/PatientDialog";
import { inScope, usePatients, type PatientScope } from "@/lib/db";
import { matchPatient } from "@/lib/search";
import { PATIENT_STATUSES, age, formatShortDate, label, patientPhone, sourceLabel } from "@/lib/sns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pacientes/")({
  head: () => ({
    meta: [
      { title: "Pacientes | Centro SNS" },
      { name: "description", content: "Base de datos de pacientes con búsqueda por nombre, documento o teléfono." },
      { property: "og:title", content: "Pacientes | Centro SNS" },
      { property: "og:description", content: "Base de datos de pacientes de Centro SNS." },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const { data: patients = [], isLoading } = usePatients();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("todos");
  const [scope, setScope] = useState<PatientScope>("activos");
  const [open, setOpen] = useState(false);

  const visible = patients.filter((p) => inScope(p, scope));
  const filtered = visible.filter(
    (p) => (status === "todos" || p.status === status) && (!query.trim() || matchPatient(p, query)),
  );

  const scopes: { value: PatientScope; label: string }[] = [
    { value: "activos", label: "Activos" },
    { value: "archivados", label: "Archivados" },
    { value: "eliminados", label: "Eliminados" },
    { value: "todos", label: "Todos" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            {visible.length} en esta vista · {patients.length} en total
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="mr-2 size-4" /> Nuevo paciente
        </Button>
      </header>

      <div className="surface space-y-3 p-3">
        <div className="relative">
          <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, apellido, cédula o WhatsApp..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {scopes.map((s) => (
            <button
              key={s.value}
              onClick={() => setScope(s.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                scope === s.value
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["todos", ...PATIENT_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "todos" ? "Todos" : label(s)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando pacientes...</p>
      ) : filtered.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-muted-foreground">Sin resultados.</div>
      ) : (
        <div className="surface divide-y divide-border overflow-hidden">
          {filtered.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-4 hover:bg-accent/40">
              <Link to="/pacientes/$id" params={{ id: p.id }} className="min-w-48 flex-1">
                <p className="font-medium">{p.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.document_number ? `Doc. ${p.document_number} · ` : ""}
                  {p.birth_date ? `${formatShortDate(p.birth_date)} (${age(p.birth_date)} años)` : "Sin fecha de nacimiento"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Origen: {sourceLabel(p.registration_source)}
                  {p.deleted_at ? " · Eliminado" : p.archived ? " · Archivado" : ""}
                </p>
              </Link>
              <span className="text-xs text-muted-foreground">{patientPhone(p) || "Sin teléfono"}</span>
              <StatusBadge value={p.status} />
              <WaButton phone={patientPhone(p)} size="icon" />
            </div>
          ))}
        </div>
      )}

      <PatientDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
