import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeleteLegend, useLegend, useSaveLegend } from "@/lib/clinical";

export function LegendEditor() {
  const { data: legend = [] } = useLegend();
  const save = useSaveLegend();
  const del = useDeleteLegend();
  const [code, setCode] = useState("");
  const [meaning, setMeaning] = useState("");

  const add = async () => {
    const c = code.trim().toUpperCase();
    if (!c || !meaning.trim()) return toast.error("Completá abreviatura y significado.");
    if (legend.some((l) => l.code === c)) return toast.error("Esa abreviatura ya existe.");
    try {
      await save.mutateAsync({ code: c, meaning: meaning.trim(), sort: legend.length + 1 });
      setCode("");
      setMeaning("");
      toast.success("Abreviatura agregada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase">Leyenda del mapa corporal</h2>
      <div className="surface space-y-2 p-4">
        {legend.map((l) => (
          <div key={l.id} className="flex items-center gap-2">
            <Input
              className="w-24 font-semibold"
              defaultValue={l.code}
              maxLength={6}
              onBlur={(e) => {
                const v = e.target.value.trim().toUpperCase();
                if (v && v !== l.code) save.mutate({ id: l.id, code: v });
              }}
            />
            <Input
              defaultValue={l.meaning}
              maxLength={80}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== l.meaning) save.mutate({ id: l.id, meaning: v });
              }}
            />
            <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => del.mutate(l.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Input className="w-24" placeholder="Ej: AR" value={code} maxLength={6} onChange={(e) => setCode(e.target.value)} />
          <Input placeholder="Significado" value={meaning} maxLength={80} onChange={(e) => setMeaning(e.target.value)} />
          <Button onClick={add} disabled={save.isPending}>Agregar</Button>
        </div>
      </div>
    </section>
  );
}
