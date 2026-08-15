import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { usePatients } from "@/lib/db";
import { matchPatient } from "@/lib/search";
import { StatusBadge } from "@/components/StatusBadge";
import type { Patient } from "@/lib/sns";
import { Search, X } from "lucide-react";

export function PatientPicker({
  value,
  onChange,
}: {
  value: Patient | null;
  onChange: (p: Patient | null) => void;
}) {
  const [query, setQuery] = useState("");
  const { data: patients = [] } = usePatients();
  const results = useMemo(
    () => (query.trim() ? patients.filter((p) => matchPatient(p, query)).slice(0, 8) : []),
    [patients, query],
  );

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
        <div>
          <p className="text-sm font-medium">{value.full_name}</p>
          <p className="text-xs text-muted-foreground">
            CI {value.document_number ?? "—"} · {value.whatsapp || value.phone || "sin teléfono"}
          </p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
        <Input
          autoFocus
          className="pl-9"
          placeholder="Buscar por nombre, apellido, cédula o teléfono"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {results.length > 0 && (
        <ul className="mt-2 max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(p);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-accent"
              >
                <span>
                  <span className="block text-sm font-medium">{p.full_name}</span>
                  <span className="block text-xs text-muted-foreground">CI {p.document_number ?? "—"}</span>
                </span>
                <StatusBadge value={p.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && results.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Sin resultados para “{query}”.</p>
      )}
    </div>
  );
}
