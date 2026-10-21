import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/PatientDialog";
import { BodyMap } from "@/components/BodyMap";
import {
  TREATMENT_STATUS,
  asMarks,
  copyMarks,
  useClinicalRecord,
  useSaveClinical,
  useSaveSession,
  useSaveTreatment,
  useSessionRevisions,
  useSessions,
  useTreatments,
  type BodyMark,
  type Treatment,
  type TreatmentSession,
} from "@/lib/clinical";
import { formatDate, todayISO } from "@/lib/sns";
import { cn } from "@/lib/utils";

const RECORD_FIELDS = [
  ["reason", "Motivo de consulta"],
  ["background", "Antecedentes"],
  ["pathologies", "Patologías"],
  ["observations", "Observaciones"],
  ["indications", "Indicaciones"],
] as const;

export function ClinicalSection({ patientId }: { patientId: string }) {
  return (
    <div className="space-y-6">
      <ClinicalRecordCard patientId={patientId} />
      <TreatmentsCard patientId={patientId} />
    </div>
  );
}

function ClinicalRecordCard({ patientId }: { patientId: string }) {
  const { data: record, isLoading } = useClinicalRecord(patientId);
  const save = useSaveClinical();
  const [form, setForm] = useState<Record<string, string>>({});
  const [marks, setMarks] = useState<BodyMark[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    const f: Record<string, string> = { professional: record?.professional ?? "" };
    RECORD_FIELDS.forEach(([k]) => (f[k] = (record?.[k] as string | null) ?? ""));
    setForm(f);
    setMarks(asMarks(record?.marks));
    setDirty(false);
  }, [record, isLoading]);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const submit = async () => {
    try {
      await save.mutateAsync({
        patient_id: patientId,
        ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null])),
        marks,
      });
      setDirty(false);
      toast.success("Ficha clínica guardada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la ficha");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando ficha clínica...</p>;

  return (
    <section className="surface space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Ficha clínica</h2>
        {dirty && <span className="text-xs text-warning-foreground">Cambios sin guardar</span>}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Field label="Profesional responsable">
            <Input value={form.professional ?? ""} maxLength={80} onChange={(e) => set("professional", e.target.value)} />
          </Field>
          {RECORD_FIELDS.map(([k, l]) => (
            <Field key={k} label={l}>
              <Textarea rows={2} maxLength={3000} value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
            </Field>
          ))}
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Mapa corporal — anotaciones del profesional, no son diagnósticos automáticos.
          </p>
          <BodyMap
            marks={marks}
            onChange={(m) => {
              setMarks(m);
              setDirty(true);
            }}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={save.isPending || !dirty}>
          Guardar ficha
        </Button>
      </div>
    </section>
  );
}

function TreatmentsCard({ patientId }: { patientId: string }) {
  const { data: treatments = [] } = useTreatments(patientId);
  const { data: sessions = [] } = useSessions(patientId);
  const [editing, setEditing] = useState<Treatment | "new" | null>(null);

  return (
    <section className="surface space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Tratamientos</h2>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="mr-1 size-4" /> Nuevo tratamiento
        </Button>
      </div>
      {treatments.length === 0 && <p className="text-sm text-muted-foreground">Sin tratamientos registrados.</p>}
      {treatments.map((t) => (
        <TreatmentItem
          key={t.id}
          treatment={t}
          sessions={sessions.filter((s) => s.treatment_id === t.id)}
          onEdit={() => setEditing(t)}
        />
      ))}
      <TreatmentDialog
        patientId={patientId}
        treatment={editing === "new" ? null : editing}
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
      />
    </section>
  );
}

function TreatmentItem({
  treatment,
  sessions,
  onEdit,
}: {
  treatment: Treatment;
  sessions: TreatmentSession[];
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [sessionDialog, setSessionDialog] = useState<TreatmentSession | "new" | null>(null);
  const done = sessions.length;
  const pending = Math.max(0, treatment.planned_sessions - done);
  const current = sessions[Math.min(page, sessions.length - 1)];

  useEffect(() => setPage(Math.max(0, sessions.length - 1)), [sessions.length]);

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <button onClick={() => setOpen((v) => !v)} aria-label="Ver historial de sesiones" className="rounded p-1 hover:bg-accent">
          <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} />
        </button>
        <div className="min-w-40 flex-1">
          <p className="font-medium">{treatment.name}</p>
          <p className="text-xs text-muted-foreground">
            {done} realizadas · {pending} pendientes · {treatment.planned_sessions} previstas
            {treatment.professional ? ` · ${treatment.professional}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{TREATMENT_STATUS[treatment.status] ?? treatment.status}</span>
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setSessionDialog("new")}>
          <Plus className="mr-1 size-4" /> Sesión
        </Button>
      </div>

      {open && (
        <div className="border-t border-border p-3">
          {!current ? (
            <p className="text-sm text-muted-foreground">Todavía no hay sesiones.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="mr-1 size-4" /> Anterior
                </Button>
                <span className="text-sm font-medium">
                  Sesión {page + 1} de {sessions.length} · {formatDate(current.session_date)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= sessions.length - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
              <SessionPage session={current} onEdit={() => setSessionDialog(current)} />
            </div>
          )}
        </div>
      )}

      <SessionDialog
        treatment={treatment}
        session={sessionDialog === "new" ? null : sessionDialog}
        previous={sessions[sessions.length - 1]}
        open={sessionDialog !== null}
        onOpenChange={(v) => !v && setSessionDialog(null)}
      />
    </div>
  );
}

function SessionPage({ session, onEdit }: { session: TreatmentSession; onEdit: () => void }) {
  const { data: revisions = [] } = useSessionRevisions(session.id);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Profesional:</span> {session.professional || "—"}
        </p>
        {(
          [
            ["Evolución", session.evolution],
            ["Procedimientos", session.procedures],
            ["Indicaciones", session.indications],
          ] as const
        ).map(([l, v]) => (
          <div key={l}>
            <p className="text-xs font-medium text-muted-foreground">{l}</p>
            <p className="whitespace-pre-wrap">{v || "—"}</p>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="mr-1 size-4" /> Corregir sesión
        </Button>
        {revisions.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Corregida {revisions.length} {revisions.length === 1 ? "vez" : "veces"}; la versión anterior queda guardada.
            Última: {new Date(revisions[0]!.changed_at).toLocaleString("es-PY")}
          </p>
        )}
      </div>
      <BodyMap marks={asMarks(session.marks)} readOnly />
    </div>
  );
}

function TreatmentDialog({
  patientId,
  treatment,
  open,
  onOpenChange,
}: {
  patientId: string;
  treatment: Treatment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const save = useSaveTreatment();
  const [f, setF] = useState({ name: "", planned: "10", status: "en_curso", professional: "", notes: "" });
  useEffect(() => {
    if (open)
      setF({
        name: treatment?.name ?? "",
        planned: String(treatment?.planned_sessions ?? 10),
        status: treatment?.status ?? "en_curso",
        professional: treatment?.professional ?? "",
        notes: treatment?.notes ?? "",
      });
  }, [open, treatment]);

  const submit = async () => {
    const planned = parseInt(f.planned, 10);
    if (!f.name.trim()) return toast.error("Indicá el nombre del tratamiento");
    if (!Number.isFinite(planned) || planned < 1) return toast.error("La cantidad de sesiones debe ser al menos 1");
    try {
      await save.mutateAsync({
        id: treatment?.id,
        patient_id: patientId,
        name: f.name.trim(),
        planned_sessions: planned,
        status: f.status,
        professional: f.professional.trim() || null,
        notes: f.notes.trim() || null,
      });
      toast.success("Tratamiento guardado");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{treatment ? "Editar tratamiento" : "Nuevo tratamiento"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre *" className="sm:col-span-2">
            <Input value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Sesiones previstas">
            <Input type="number" min={1} value={f.planned} onChange={(e) => setF({ ...f, planned: e.target.value })} />
          </Field>
          <Field label="Estado">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={f.status}
              onChange={(e) => setF({ ...f, status: e.target.value })}
            >
              {Object.entries(TREATMENT_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Profesional" className="sm:col-span-2">
            <Input value={f.professional} maxLength={80} onChange={(e) => setF({ ...f, professional: e.target.value })} />
          </Field>
          <Field label="Notas" className="sm:col-span-2">
            <Textarea rows={2} value={f.notes} maxLength={2000} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SessionDialog({
  treatment,
  session,
  previous,
  open,
  onOpenChange,
}: {
  treatment: Treatment;
  session: TreatmentSession | null;
  previous?: TreatmentSession;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const save = useSaveSession();
  const empty = useMemo(
    () => ({ date: todayISO(), professional: treatment.professional ?? "", evolution: "", procedures: "", indications: "" }),
    [treatment.professional],
  );
  const [f, setF] = useState(empty);
  const [marks, setMarks] = useState<BodyMark[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDirty(false);
    if (session) {
      setF({
        date: session.session_date,
        professional: session.professional ?? "",
        evolution: session.evolution ?? "",
        procedures: session.procedures ?? "",
        indications: session.indications ?? "",
      });
      setMarks(asMarks(session.marks));
    } else {
      setF(empty);
      setMarks([]);
    }
  }, [open, session, empty]);

  const upd = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };

  const close = (v: boolean) => {
    if (!v && dirty && !window.confirm("Tenés cambios sin guardar. ¿Salir igual?")) return;
    onOpenChange(v);
  };

  const submit = async () => {
    if (!f.date) return toast.error("Indicá la fecha de la sesión");
    try {
      await save.mutateAsync({
        id: session?.id,
        treatment_id: treatment.id,
        patient_id: treatment.patient_id,
        session_date: f.date,
        professional: f.professional.trim() || null,
        evolution: f.evolution.trim() || null,
        procedures: f.procedures.trim() || null,
        indications: f.indications.trim() || null,
        marks,
      });
      toast.success(session ? "Corrección guardada (la versión anterior queda en el historial)" : "Sesión registrada");
      setDirty(false);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la sesión");
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{session ? "Corregir sesión" : `Nueva sesión — ${treatment.name}`}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha *">
                <Input type="date" value={f.date} onChange={(e) => upd("date", e.target.value)} />
              </Field>
              <Field label="Profesional">
                <Input value={f.professional} maxLength={80} onChange={(e) => upd("professional", e.target.value)} />
              </Field>
            </div>
            {(
              [
                ["evolution", "Evolución"],
                ["procedures", "Procedimientos"],
                ["indications", "Indicaciones"],
              ] as const
            ).map(([k, l]) => (
              <Field key={k} label={l}>
                <Textarea rows={3} maxLength={3000} value={f[k]} onChange={(e) => upd(k, e.target.value)} />
              </Field>
            ))}
          </div>
          <div className="space-y-2">
            {!session && previous && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMarks(copyMarks(asMarks(previous.marks)));
                  setDirty(true);
                  toast.success("Marcas copiadas de la sesión anterior");
                }}
              >
                <Copy className="mr-1 size-4" /> Copiar marcas de la sesión anterior
              </Button>
            )}
            <BodyMap
              marks={marks}
              onChange={(m) => {
                setMarks(m);
                setDirty(true);
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            Guardar sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
