import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ChevronLeft, ChevronRight, MousePointer2, Pencil, Plus, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { age } from "@/lib/sns";
import bodyImg from "@/assets/ficha-cuerpo.jpg.asset.json";

type Patient = Database["public"]["Tables"]["patients"]["Row"];
type Ficha = Database["public"]["Tables"]["fichas"]["Row"];
type FData = Record<string, string | boolean>;
export type FichaMark = {
  id: string;
  kind: "lapiz" | "flecha" | "texto";
  x: number;
  y: number;
  angle: number;
  text: string;
  points?: [number, number][];
};
type Tool = "mover" | FichaMark["kind"];

const asMarks = (v: unknown): FichaMark[] => (Array.isArray(v) ? (v as FichaMark[]) : []);
const asData = (v: unknown): FData => (v && typeof v === "object" ? (v as FData) : {});

/** Siguiente sesión: copia la ficha de seguimiento anterior (datos y dibujos) con fecha y número nuevos. */
export function nextFichaFrom(prev: Pick<Ficha, "kind" | "data" | "marks"> | undefined) {
  if (!prev) return { kind: "primera", data: {}, marks: [] as FichaMark[] };
  const data = prev.kind === "seguimiento" ? { ...asData(prev.data) } : {};
  return { kind: "seguimiento", data, marks: asMarks(prev.marks).map((m) => ({ ...m, id: crypto.randomUUID() })) };
}

function useFichas(patientId: string) {
  return useQuery({
    queryKey: ["fichas", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("fichas").select("*").eq("patient_id", patientId).order("session_number");
      if (error) throw error;
      return data;
    },
  });
}

export function FichasBook({ patient }: { patient: Patient }) {
  const qc = useQueryClient();
  const { data: fichas = [], isLoading } = useFichas(patient.id);
  const [page, setPage] = useState(0);
  const idx = Math.min(page, Math.max(0, fichas.length - 1));
  const current = fichas[idx];

  const create = useMutation({
    mutationFn: async () => {
      const last = fichas[fichas.length - 1];
      const n = nextFichaFrom(last);
      const { error } = await supabase.from("fichas").insert({
        patient_id: patient.id,
        session_number: (last?.session_number ?? 0) + 1,
        kind: n.kind,
        data: n.data as never,
        marks: n.marks as never,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["fichas", patient.id] });
      setPage(fichas.length);
      toast.success("Nueva sesión creada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo crear"),
  });

  return (
    <section className="surface space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Fichas por sesión</h2>
        <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus className="mr-1 size-4" /> {fichas.length ? "Nueva sesión" : "Crear ficha de primera consulta"}
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando fichas...</p>
      ) : !current ? (
        <p className="text-sm text-muted-foreground">Todavía no hay fichas para este paciente.</p>
      ) : (
        <>
          <FichaPage key={current.id} ficha={current} patient={patient} />
          <div className="flex items-center justify-center gap-4 border-t border-border pt-3">
            <Button variant="outline" size="icon" aria-label="Sesión anterior" disabled={idx === 0} onClick={() => setPage(idx - 1)}>
              <ChevronLeft className="size-5" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Sesión {current.session_number} de {fichas.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Sesión siguiente"
              disabled={idx >= fichas.length - 1}
              onClick={() => setPage(idx + 1)}
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function FichaPage({ ficha, patient }: { ficha: Ficha; patient: Patient }) {
  const qc = useQueryClient();
  const [data, setData] = useState<FData>(asData(ficha.data));
  const [marks, setMarks] = useState<FichaMark[]>(asMarks(ficha.marks));
  const [date, setDate] = useState(ficha.session_date);
  const [status, setStatus] = useState<"guardado" | "guardando" | "pendiente">("guardado");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("pendiente");
    const t = setTimeout(async () => {
      setStatus("guardando");
      const { error } = await supabase
        .from("fichas")
        .update({ data: data as never, marks: marks as never, session_date: date })
        .eq("id", ficha.id);
      if (error) toast.error("No se pudo guardar la ficha");
      setStatus("guardado");
      qc.invalidateQueries({ queryKey: ["fichas", patient.id] });
    }, 800);
    return () => clearTimeout(t);
  }, [data, marks, date, ficha.id, patient.id, qc]);

  const f = (k: string) => ({
    value: String(data[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setData((d) => ({ ...d, [k]: e.target.value })),
  });
  const c = (k: string) => ({ checked: Boolean(data[k]), onChange: (v: boolean) => setData((d) => ({ ...d, [k]: v })) });
  const primera = ficha.kind === "primera";

  return (
    <div className="mx-auto max-w-4xl space-y-4 rounded-md border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-semibold uppercase">{primera ? "Ficha de primera consulta" : "Ficha de seguimiento"}</span>
        <span>{status === "guardado" ? "✓ Guardado" : "Guardando..."}</span>
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <Ro label="Paciente" value={patient.full_name ?? `${patient.first_name} ${patient.last_name}`} />
        <div className="flex gap-2">
          <Line label="Fecha">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="fl" />
          </Line>
          <Ro label="Sesión N°" value={String(ficha.session_number)} />
        </div>
        {primera && (
          <>
            <Ro label="C.I. / RUC" value={patient.document_number ?? "—"} />
            <Ro label="Cel / W" value={patient.whatsapp || patient.phone || "—"} />
            <Ro label="Dom." value={[patient.address, patient.city].filter(Boolean).join(", ") || "—"} />
            <Ro label="Edad" value={patient.birth_date ? `${age(patient.birth_date)} años` : "—"} />
          </>
        )}
      </div>

      {primera && (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Check label="1° sesión" {...c("primera_sesion")} />
            <Txt label="Cant. sesiones estimadas" k="sesiones_est" f={f} w="w-16" />
            <span className="flex items-center gap-2">
              Sexo: <Check label="F" {...c("sexo_f")} /> <Check label="M" {...c("sexo_m")} />
            </span>
            <Txt label="Altura" k="altura" f={f} w="w-16" />
            <Txt label="Peso" k="peso" f={f} w="w-16" />
            <Txt label="Prof." k="prof" f={f} w="w-40" />
          </div>
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="space-y-1.5 text-sm">
              {[
                ["cervical", "Cervical"],
                ["migrana", "Migraña / vista / oído D-I / mareo / convulsión"],
                ["desmayo", "Desmayo / Memoria / Maxilar D/I"],
                ["hombro_d", "Hombro D, Codo D, Nódulos, Perd. fuerza, dolor agudo, muñeca, falanges 1-5"],
                ["hombro_i", "Hombro I, Codo I, Nódulos, Perd. fuerza, dolor agudo, muñeca, falanges 1-5"],
                ["dorsal", "Dorsal"],
                ["pecho", "Pecho / costillas"],
                ["lumbar", "Lumbar"],
                ["femoral", "Femoral D/I, Ciático D/I, Coxis, Sacro"],
                ["cadera_d", "Cadera D, Rodilla D, Tobillo D, pie y falanges"],
                ["cadera_i", "Cadera I, Rodilla I, Tobillo I, pie y falanges"],
                ["diagnostico", "Diagnóstico previo"],
              ].map(([k, l]) => (
                <Txt key={k} label={l!} k={k!} f={f} />
              ))}
            </div>
            <div className="space-y-1.5 border-l border-border pl-3 text-sm">
              {["Presión", "Colesterol", "Triglicéridos", "Ácido úrico", "Diabetes", "Tiro", "Ansiedad / Depresión", "Cirug. Art.", "Alergias"].map(
                (l) => (
                  <YesNo key={l} label={l} k={`ant_${l}`} data={data} setData={setData} />
                ),
              )}
              <Txt label="Med. que consume" k="medicamentos" f={f} />
              <Metodo c={c} />
            </div>
          </div>
        </>
      )}
      {!primera && <Metodo c={c} />}

      <Board marks={marks} onChange={setMarks} />

      {primera ? (
        <div className="grid gap-1.5 text-sm">
          <Area label="Patologías" k="patologias" f={f} />
          <Area label="Obs." k="obs" f={f} />
          <p className="pt-1 font-semibold">Indicaciones</p>
          <div className="flex flex-wrap gap-3">
            <Txt label="F-" k="ind_f" f={f} w="w-32" />
            <Txt label="Dosis por día" k="ind_dosis" f={f} w="w-24" />
          </div>
          <Txt label="Desinflamante, Emplasto, P. coca, Tónico Moringa" k="ind_desinf" f={f} />
          <div className="flex flex-wrap gap-3">
            <Txt label="Calmante: Val. G." k="ind_val" f={f} w="w-20" />
            <Txt label="Cap." k="ind_cap" f={f} w="w-20" />
            <Txt label="F75" k="ind_f75" f={f} w="w-20" />
            <Txt label="F89" k="ind_f89" f={f} w="w-20" />
          </div>
          <Txt label="Ejer: codo, Cervical, Nadar, piernas, sentado, dedos, otro" k="ejercicios" f={f} />
          <div className="flex flex-wrap gap-3">
            <Txt label="Resp." k="resp" f={f} w="w-40" />
            <Txt label="Frec. día" k="frec" f={f} w="w-24" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Txt label="Dra.: C/" k="dra" f={f} w="w-32" />
            <Txt label="Asistente" k="asistente" f={f} w="w-40" />
          </div>
        </div>
      ) : (
        <div className="grid gap-1.5 text-sm">
          <Area label="Obs." k="obs" f={f} />
          <Area label="Rp." k="rp" f={f} />
          <Txt label="Ausencia" k="ausencia" f={f} />
          <div className="flex flex-wrap items-center gap-3">
            <Txt label="Rsp. Pn." k="rsp" f={f} w="w-32" />
            <Txt label="Frec./día" k="frec" f={f} w="w-20" />
            <span>Control de uso:</span>
            <Check label="Emplasto" {...c("emplasto")} />
            <Check label="T. Moringa" {...c("moringa")} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Txt label="Form." k="form" f={f} w="w-40" />
            <Txt label="Estiramientos" k="estiramientos" f={f} w="w-56" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Txt label="Próx. Consulta R." k="prox" f={f} w="w-24" />
            <Line label="Fecha">
              <input type="date" {...f("prox_fecha")} className="fl" />
            </Line>
            <Line label="Hora">
              <input type="time" {...f("prox_hora")} className="fl" />
            </Line>
            <span className="text-xs text-muted-foreground">(paciente debe contactar antes)</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Txt label="Atendido por: C." k="atendido" f={f} w="w-32" />
            <Txt label="Asistido por" k="asistido" f={f} w="w-40" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Campos estilo papel ---------- */
type F = (k: string) => { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void };
function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-1 items-end gap-1.5 whitespace-nowrap">
      <span>{label}:</span>
      {children}
    </label>
  );
}
function Ro({ label, value }: { label: string; value: string }) {
  return (
    <Line label={label}>
      <span className="flex-1 border-b border-dotted border-muted-foreground px-1 font-medium">{value}</span>
    </Line>
  );
}
function Txt({ label, k, f, w }: { label: string; k: string; f: F; w?: string }) {
  return (
    <label className={cn("flex items-end gap-1.5", !w && "w-full")}>
      <span className="shrink-0">{label}:</span>
      <input {...f(k)} className={cn("fl", w ?? "flex-1")} />
    </label>
  );
}
function Area({ label, k, f }: { label: string; k: string; f: F }) {
  return (
    <label className="block">
      <span className="font-semibold">{label}:</span>
      <textarea {...f(k)} rows={2} className="fl w-full resize-y" />
    </label>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-1">
      {label} <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-primary" />
    </label>
  );
}
function YesNo({ label, k, data, setData }: { label: string; k: string; data: FData; setData: React.Dispatch<React.SetStateAction<FData>> }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{label}:</span>
      <span className="flex gap-2">
        {["SÍ", "NO"].map((v) => (
          <Check key={v} label={v} checked={data[k] === v} onChange={(on) => setData((d) => ({ ...d, [k]: on ? v : "" }))} />
        ))}
      </span>
    </div>
  );
}
function Metodo({ c }: { c: (k: string) => { checked: boolean; onChange: (v: boolean) => void } }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      Método empleado: <Check label="semanal" {...c("semanal")} /> <Check label="quincenal" {...c("quincenal")} />
    </div>
  );
}

/* ---------- Lienzo: lápiz, flecha y cuadro de texto (todo movible) ---------- */
function Board({ marks, onChange }: { marks: FichaMark[]; onChange: (m: FichaMark[]) => void }) {
  const [tool, setTool] = useState<Tool>("lapiz");
  const [selected, setSelected] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const drawing = useRef<FichaMark | null>(null);
  const drag = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [live, setLive] = useState<FichaMark | null>(null);
  const sel = marks.find((m) => m.id === selected);

  const rel = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const update = (id: string, patch: Partial<FichaMark>) => onChange(marks.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const startDrag = (e: React.PointerEvent, m: FichaMark) => {
    e.stopPropagation();
    setSelected(m.id);
    if (tool !== "mover") return;
    const p = rel(e);
    drag.current = { id: m.id, sx: p.x, sy: p.y, ox: m.x, oy: m.y };
    ref.current?.setPointerCapture(e.pointerId);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ["mover", "Mover", MousePointer2],
            ["lapiz", "Lápiz", Pencil],
            ["flecha", "Flecha", ArrowDown],
            ["texto", "Cuadro de texto", Type],
          ] as const
        ).map(([t, l, Icon]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTool(t)}
            className={cn(
              "flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
              tool === t ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}
          >
            <Icon className="size-4" /> {l}
          </button>
        ))}
        {sel && (
          <Button size="sm" variant="ghost" onClick={() => (onChange(marks.filter((m) => m.id !== sel.id)), setSelected(null))}>
            <Trash2 className="mr-1 size-4" /> Borrar seleccionado
          </Button>
        )}
      </div>
      {sel?.kind === "flecha" && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Dirección
          <input type="range" min={0} max={359} value={sel.angle} onChange={(e) => update(sel.id, { angle: Number(e.target.value) })} className="flex-1" />
        </label>
      )}
      {sel?.kind === "texto" && (
        <input value={sel.text} onChange={(e) => update(sel.id, { text: e.target.value })} className="fl w-full" placeholder="Texto" />
      )}

      <div
        ref={ref}
        className={cn("relative mx-auto aspect-square w-full max-w-2xl touch-none select-none overflow-hidden rounded border border-border bg-card", tool !== "mover" && "cursor-crosshair")}
        onPointerDown={(e) => {
          const p = rel(e);
          if (tool === "mover") return setSelected(null);
          const base = { id: crypto.randomUUID(), x: 0, y: 0, angle: 0, text: "" };
          if (tool === "lapiz") {
            drawing.current = { ...base, kind: "lapiz", points: [[p.x, p.y]] };
            setLive(drawing.current);
            ref.current?.setPointerCapture(e.pointerId);
          } else {
            const m: FichaMark = { ...base, kind: tool, x: p.x, y: p.y, text: tool === "texto" ? "Texto" : "" };
            onChange([...marks, m]);
            setSelected(m.id);
            setTool("mover");
          }
        }}
        onPointerMove={(e) => {
          const p = rel(e);
          if (drawing.current) {
            drawing.current = { ...drawing.current, points: [...drawing.current.points!, [p.x, p.y]] };
            setLive(drawing.current);
          } else if (drag.current) {
            const d = drag.current;
            update(d.id, { x: d.ox + p.x - d.sx, y: d.oy + p.y - d.sy });
          }
        }}
        onPointerUp={() => {
          if (drawing.current && drawing.current.points!.length > 1) onChange([...marks, drawing.current]);
          drawing.current = null;
          drag.current = null;
          setLive(null);
        }}
      >
        <img src={bodyImg.url} alt="Esqueleto de la ficha" className="pointer-events-none absolute inset-0 size-full object-contain" draggable={false} />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 size-full">
          {[...marks, ...(live ? [live] : [])]
            .filter((m) => m.kind === "lapiz")
            .map((m) => (
              <polyline
                key={m.id}
                points={m.points!.map(([x, y]) => `${x},${y}`).join(" ")}
                transform={`translate(${m.x} ${m.y})`}
                fill="none"
                strokeWidth={selected === m.id ? 5 : 3}
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn("stroke-danger", tool === "mover" && "cursor-move")}
                style={{ pointerEvents: tool === "mover" ? "stroke" : "none" }}
                onPointerDown={(e) => startDrag(e, m)}
              />
            ))}
        </svg>
        {marks
          .filter((m) => m.kind !== "lapiz")
          .map((m) => (
            <div
              key={m.id}
              onPointerDown={(e) => startDrag(e, m)}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 text-danger",
                tool === "mover" ? "cursor-move" : "pointer-events-none",
                selected === m.id && "rounded ring-2 ring-primary",
              )}
              style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
            >
              {m.kind === "flecha" ? (
                <ArrowDown className="size-8" strokeWidth={3} style={{ transform: `rotate(${m.angle}deg)` }} />
              ) : (
                <span className="block whitespace-pre rounded border border-danger bg-card px-1.5 py-0.5 text-xs font-bold">{m.text || "Texto"}</span>
              )}
            </div>
          ))}
      </div>
      <p className="text-xs text-muted-foreground">Elegí “Mover” para arrastrar cualquier dibujo, flecha o texto. Los cambios se guardan solos.</p>
    </div>
  );
}
