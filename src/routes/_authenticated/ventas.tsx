import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/PatientDialog";
import { formatGs, useProducts, useRegisterSale, useSales, type SaleItem } from "@/lib/clinical";
import { formatDate, todayISO } from "@/lib/sns";

export const Route = createFileRoute("/_authenticated/ventas")({
  head: () => ({
    meta: [
      { title: "Ventas | Centro SNS" },
      { name: "description", content: "Registro de ventas de artículos con precio y costo del momento." },
      { property: "og:title", content: "Ventas | Centro SNS" },
      { property: "og:description", content: "Ventas de artículos de Centro SNS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const { data: products = [] } = useProducts();
  const { data: sales = [], isLoading } = useSales();
  const register = useRegisterSale();
  const [date, setDate] = useState(todayISO());
  const [lines, setLines] = useState<{ product_id: string; quantity: string }[]>([]);
  const [pick, setPick] = useState("");

  const byId = new Map(products.map((p) => [p.id, p]));
  const total = lines.reduce((s, l) => s + (byId.get(l.product_id)?.sale_price ?? 0) * (parseInt(l.quantity, 10) || 0), 0);

  const submit = async () => {
    const items = lines.map((l) => ({ product_id: l.product_id, quantity: parseInt(l.quantity, 10) }));
    if (items.length === 0 || items.some((i) => !Number.isFinite(i.quantity) || i.quantity <= 0)) {
      toast.error("Agregá artículos con cantidades válidas");
      return;
    }
    try {
      await register.mutateAsync({ items, date });
      setLines([]);
      toast.success("Venta registrada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo registrar la venta");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
        <p className="text-sm text-muted-foreground">
          Cada venta guarda el precio y el costo del momento; cambios posteriores no alteran el historial.
        </p>
      </header>

      <section className="surface space-y-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Fecha">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Artículo" className="min-w-56 flex-1">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
            >
              <option value="">Elegí un artículo…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatGs(p.sale_price)} ({p.stock} en existencia)
                </option>
              ))}
            </select>
          </Field>
          <Button
            variant="secondary"
            disabled={!pick}
            onClick={() => {
              setLines((l) => [...l, { product_id: pick, quantity: "1" }]);
              setPick("");
            }}
          >
            <Plus className="mr-1 size-4" /> Agregar
          </Button>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="flex-1">{byId.get(l.product_id)?.name}</span>
            <Input
              className="w-20"
              type="number"
              min={1}
              value={l.quantity}
              onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
            />
            <Button size="icon" variant="ghost" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="Quitar">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="font-medium">Total: {formatGs(total)}</span>
          <Button onClick={submit} disabled={register.isPending || lines.length === 0}>
            Registrar venta
          </Button>
        </div>
      </section>

      <section className="surface divide-y divide-border">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Cargando ventas...</p>
        ) : sales.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Sin ventas registradas.</p>
        ) : (
          sales.map((s) => {
            const items = (s as unknown as { sale_items: SaleItem[] }).sale_items ?? [];
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <span className="w-24 text-muted-foreground">{formatDate(s.sale_date)}</span>
                <span className="flex-1">{items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}</span>
                <span>{formatGs(s.total)}</span>
                <span className="text-xs text-muted-foreground">margen {formatGs(s.total - s.cost_total)}</span>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
