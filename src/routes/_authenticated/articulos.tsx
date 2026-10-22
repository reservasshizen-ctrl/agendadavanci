import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PackagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/PatientDialog";
import {
  formatGs,
  parseGs,
  unitCost,
  useDeleteIngredient,
  useIngredients,
  useProducts,
  useSaveIngredient,
  useSaveProduct,
  useStockMovement,
  type Ingredient,
  type Product,
} from "@/lib/clinical";

export const Route = createFileRoute("/_authenticated/articulos")({
  head: () => ({
    meta: [
      { title: "Artículos y fórmulas | Centro SNS" },
      { name: "description", content: "Artículos, fórmulas con ingredientes, costos, precios y existencias." },
      { property: "og:title", content: "Artículos y fórmulas | Centro SNS" },
      { property: "og:description", content: "Gestión de artículos y fórmulas de Centro SNS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArticlesPage,
});

function ArticlesPage() {
  const { data: products = [], isLoading } = useProducts();
  const { data: ingredients = [] } = useIngredients();
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [stockFor, setStockFor] = useState<Product | null>(null);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Artículos y fórmulas</h1>
          <p className="text-sm text-muted-foreground">Montos en guaraníes. El costo unitario se calcula con la fórmula.</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-2 size-4" /> Nuevo artículo
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : products.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-muted-foreground">Todavía no hay artículos.</div>
      ) : (
        <div className="surface divide-y divide-border">
          {products.map((p) => {
            const cost = unitCost(p, ingredients.filter((i) => i.product_id === p.id));
            const margin = p.sale_price - cost;
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-48 flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.description || "Sin descripción"}</p>
                </div>
                <Stat label="Costo unit.">{formatGs(cost)}</Stat>
                <Stat label="Precio">{formatGs(p.sale_price)}</Stat>
                <Stat label="Margen">
                  <span className={margin < 0 ? "text-danger" : ""}>{formatGs(margin)}</span>
                </Stat>
                <Stat label="Existencias">{p.stock}</Stat>
                <Button size="sm" variant="outline" onClick={() => setStockFor(p)}>
                  <PackagePlus className="mr-1 size-4" /> Movimiento
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                  <Pencil className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <ProductDialog
        product={editing === "new" ? null : editing}
        ingredients={ingredients}
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
      />
      <StockDialog product={stockFor} onClose={() => setStockFor(null)} />
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-20 text-right">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  );
}

function ProductDialog({
  product,
  ingredients,
  open,
  onOpenChange,
}: {
  product: Product | null;
  ingredients: Ingredient[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const save = useSaveProduct();
  const saveIng = useSaveIngredient();
  const delIng = useDeleteIngredient();
  const [f, setF] = useState({ name: "", description: "", yield: "1", packaging: "0", other: "0", price: "0" });
  const [ing, setIng] = useState({ name: "", quantity: "", unit: "g", cost: "" });
  const mine = product ? ingredients.filter((i) => i.product_id === product.id) : [];

  useEffect(() => {
    if (!open) return;
    setF({
      name: product?.name ?? "",
      description: product?.description ?? "",
      yield: String(product?.yield_units ?? 1),
      packaging: String(product?.packaging_cost ?? 0),
      other: String(product?.other_cost ?? 0),
      price: String(product?.sale_price ?? 0),
    });
  }, [open, product]);

  const preview = unitCost(
    { yield_units: parseInt(f.yield, 10) || 1, packaging_cost: parseGs(f.packaging), other_cost: parseGs(f.other) },
    mine,
  );

  const submit = async () => {
    if (!f.name.trim()) {
      toast.error("Indicá el nombre del artículo");
      return;
    }
    const y = parseInt(f.yield, 10);
    if (!Number.isFinite(y) || y < 1) {
      toast.error("El rendimiento debe ser al menos 1 unidad");
      return;
    }
    try {
      await save.mutateAsync({
        id: product?.id,
        name: f.name.trim(),
        description: f.description.trim() || null,
        yield_units: y,
        packaging_cost: parseGs(f.packaging),
        other_cost: parseGs(f.other),
        sale_price: parseGs(f.price),
      });
      toast.success("Artículo guardado");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const addIngredient = async () => {
    if (!product) return;
    if (!ing.name.trim()) {
      toast.error("Indicá el ingrediente");
      return;
    }
    try {
      await saveIng.mutateAsync({
        product_id: product.id,
        name: ing.name.trim(),
        quantity: Number(ing.quantity.replace(",", ".")) || 0,
        unit: ing.unit.trim() || "u",
        cost: parseGs(ing.cost),
      });
      setIng({ name: "", quantity: "", unit: "g", cost: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo agregar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Editar artículo" : "Nuevo artículo"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nombre *" className="sm:col-span-3">
            <Input value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Descripción" className="sm:col-span-3">
            <Textarea rows={2} value={f.description} maxLength={1000} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
          <Field label="Rendimiento (unidades)">
            <Input type="number" min={1} value={f.yield} onChange={(e) => setF({ ...f, yield: e.target.value })} />
          </Field>
          <Field label="Envase por unidad (₲)">
            <Input inputMode="numeric" value={f.packaging} onChange={(e) => setF({ ...f, packaging: e.target.value })} />
          </Field>
          <Field label="Otros costos del lote (₲)">
            <Input inputMode="numeric" value={f.other} onChange={(e) => setF({ ...f, other: e.target.value })} />
          </Field>
          <Field label="Precio de venta (₲)">
            <Input inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          </Field>
          <div className="sm:col-span-2 self-end text-sm">
            Costo unitario calculado: <span className="font-semibold">{formatGs(preview)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Ingredientes de la fórmula (costo total del lote)</p>
          {!product ? (
            <p className="text-xs text-muted-foreground">Guardá el artículo para agregar ingredientes.</p>
          ) : (
            <>
              {mine.map((i) => (
                <div key={i.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">
                    {i.name} — {i.quantity} {i.unit}
                  </span>
                  <span>{formatGs(i.cost)}</span>
                  <Button size="icon" variant="ghost" onClick={() => delIng.mutate(i.id)} aria-label="Quitar ingrediente">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2">
                <Input placeholder="Ingrediente" value={ing.name} onChange={(e) => setIng({ ...ing, name: e.target.value })} />
                <Input placeholder="Cant." value={ing.quantity} onChange={(e) => setIng({ ...ing, quantity: e.target.value })} />
                <Input placeholder="Unidad" value={ing.unit} onChange={(e) => setIng({ ...ing, unit: e.target.value })} />
                <Input placeholder="Costo ₲" value={ing.cost} onChange={(e) => setIng({ ...ing, cost: e.target.value })} />
                <Button size="icon" onClick={addIngredient} aria-label="Agregar ingrediente">
                  <Plus className="size-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            Guardar artículo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const move = useStockMovement();
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("produccion");
  useEffect(() => setQty(""), [product]);
  const submit = async () => {
    const n = parseInt(qty, 10);
    if (!product || !Number.isFinite(n) || n === 0) {
      toast.error("Indicá una cantidad distinta de cero");
      return;
    }
    if (product.stock + n < 0) {
      toast.error("Las existencias no pueden quedar negativas");
      return;
    }
    try {
      await move.mutateAsync({ product, quantity: n, reason });
      toast.success("Movimiento registrado");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo registrar");
    }
  };
  return (
    <Dialog open={product !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Movimiento de existencias — {product?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cantidad (negativa para restar)">
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="Motivo">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="produccion">Producción</option>
              <option value="compra">Compra</option>
              <option value="ajuste">Ajuste</option>
              <option value="merma">Merma</option>
            </select>
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={move.isPending}>
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
