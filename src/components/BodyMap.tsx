import { useRef, useState } from "react";
import { ArrowDown, MousePointer2, Trash2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useLegend, type BodyMark, type BodySide } from "@/lib/clinical";

type Tool = "mover" | "flecha" | "texto";

function Silhouette({ side }: { side: BodySide }) {
  return (
    <svg viewBox="0 0 200 440" className="absolute inset-0 size-full" aria-hidden>
      <g className="fill-secondary stroke-muted-foreground" strokeWidth="1.5">
        <ellipse cx="100" cy="38" rx="24" ry="29" />
        <rect x="90" y="64" width="20" height="14" rx="4" />
        <path d="M58 82 Q100 72 142 82 L150 200 Q100 215 50 200 Z" />
        <path d="M58 84 L36 150 L28 232 L40 234 L52 160 L64 110 Z" />
        <path d="M142 84 L164 150 L172 232 L160 234 L148 160 L136 110 Z" />
        <path d="M52 200 Q100 218 148 200 L144 300 L132 420 L110 420 L104 260 L96 260 L90 420 L68 420 L56 300 Z" />
      </g>
      {side === "espalda" ? (
        <line x1="100" y1="80" x2="100" y2="205" className="stroke-muted-foreground" strokeDasharray="4 4" />
      ) : (
        <circle cx="100" cy="150" r="2" className="fill-muted-foreground" />
      )}
      <text x="100" y="436" textAnchor="middle" className="fill-muted-foreground text-[11px]">
        {side === "frente" ? "Frente" : "Espalda"}
      </text>
    </svg>
  );
}

export function BodyMap({
  marks,
  onChange,
  readOnly,
}: {
  marks: BodyMark[];
  onChange?: (m: BodyMark[]) => void;
  readOnly?: boolean;
}) {
  const [tool, setTool] = useState<Tool>("mover");
  const [pendingText, setPendingText] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const { data: legend = [] } = useLegend();
  const sel = marks.find((m) => m.id === selected);

  const update = (id: string, patch: Partial<BodyMark>) =>
    onChange?.(marks.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const place = (side: BodySide, x: number, y: number) => {
    if (readOnly || tool === "mover") return;
    const m: BodyMark = {
      id: crypto.randomUUID(),
      kind: tool,
      side,
      x,
      y,
      angle: 0,
      text: tool === "texto" ? pendingText || "Texto" : "",
      description: "",
    };
    onChange?.([...marks, m]);
    setSelected(m.id);
    setTool("mover");
  };

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolBtn active={tool === "mover"} onClick={() => setTool("mover")} icon={<MousePointer2 className="size-4" />}>
            Seleccionar / mover
          </ToolBtn>
          <ToolBtn active={tool === "flecha"} onClick={() => setTool("flecha")} icon={<ArrowDown className="size-4" />}>
            Flecha
          </ToolBtn>
          <ToolBtn
            active={tool === "texto" && !legend.some((l) => l.code === pendingText)}
            onClick={() => {
              setPendingText("");
              setTool("texto");
            }}
            icon={<Type className="size-4" />}
          >
            Texto
          </ToolBtn>
          {legend.map((l) => (
            <button
              key={l.id}
              type="button"
              title={l.meaning}
              onClick={() => {
                setPendingText(l.code);
                setTool("texto");
              }}
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-semibold",
                tool === "texto" && pendingText === l.code ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {l.code}
            </button>
          ))}
          {tool !== "mover" && <span className="text-xs text-muted-foreground">Tocá el cuerpo para colocar la marca.</span>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {(["frente", "espalda"] as const).map((side) => (
          <Canvas
            key={side}
            side={side}
            marks={marks.filter((m) => m.side === side)}
            selected={selected}
            readOnly={readOnly}
            placing={tool !== "mover"}
            onPlace={(x, y) => place(side, x, y)}
            onSelect={setSelected}
            onMove={(id, x, y) => update(id, { x, y })}
          />
        ))}
      </div>

      {legend.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {legend.map((l) => `${l.code}: ${l.meaning}`).join(" · ")}
        </p>
      )}

      {sel && !readOnly && (
        <div className="surface space-y-2 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Marca seleccionada ({sel.kind}, {sel.side})</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onChange?.(marks.filter((m) => m.id !== sel.id));
                setSelected(null);
              }}
            >
              <Trash2 className="mr-1 size-4" /> Eliminar
            </Button>
          </div>
          {sel.kind === "texto" ? (
            <Input value={sel.text} maxLength={40} onChange={(e) => update(sel.id, { text: e.target.value })} />
          ) : (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Dirección
              <input
                type="range"
                min={0}
                max={359}
                value={sel.angle}
                onChange={(e) => update(sel.id, { angle: Number(e.target.value) })}
                className="flex-1"
              />
            </label>
          )}
          <Textarea
            placeholder="Descripción de la marca (anotación del profesional)"
            value={sel.description}
            maxLength={500}
            rows={2}
            onChange={(e) => update(sel.id, { description: e.target.value })}
          />
        </div>
      )}

      {readOnly && marks.some((m) => m.description) && (
        <ul className="space-y-1 text-xs">
          {marks
            .filter((m) => m.description)
            .map((m) => (
              <li key={m.id}>
                <span className="font-semibold">{m.kind === "texto" ? m.text : "Flecha"}</span> ({m.side}): {m.description}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Canvas({
  side,
  marks,
  selected,
  readOnly,
  placing,
  onPlace,
  onSelect,
  onMove,
}: {
  side: BodySide;
  marks: BodyMark[];
  selected: string | null;
  readOnly?: boolean;
  placing: boolean;
  onPlace: (x: number, y: number) => void;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<string | null>(null);
  const rel = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };
  return (
    <div
      ref={ref}
      className={cn(
        "relative aspect-[200/440] w-full touch-none select-none rounded-lg border border-border bg-card",
        placing && "cursor-crosshair",
      )}
      onPointerDown={(e) => {
        if (e.target === ref.current || (e.target as Element).closest("svg")) {
          if (placing) {
            const p = rel(e);
            onPlace(p.x, p.y);
          } else onSelect(null);
        }
      }}
      onPointerMove={(e) => {
        if (drag.current) {
          const p = rel(e);
          onMove(drag.current, p.x, p.y);
        }
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
    >
      <Silhouette side={side} />
      {marks.map((m) => (
        <button
          key={m.id}
          type="button"
          title={m.description || undefined}
          onPointerDown={(e) => {
            e.stopPropagation();
            onSelect(m.id);
            if (!readOnly) {
              drag.current = m.id;
              (e.currentTarget.parentElement as HTMLElement).setPointerCapture?.(e.pointerId);
            }
          }}
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2 rounded text-danger",
            selected === m.id && "ring-2 ring-primary",
          )}
          style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
        >
          {m.kind === "flecha" ? (
            <ArrowDown className="size-6" strokeWidth={3} style={{ transform: `rotate(${m.angle}deg)` }} />
          ) : (
            <span className="block rounded border border-danger bg-card px-1 text-[11px] font-bold leading-4">{m.text}</span>
          )}
        </button>
      ))}
    </div>
  );
}
