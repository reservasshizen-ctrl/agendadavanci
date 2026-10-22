import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type ClinicalRecord = T["clinical_records"]["Row"];
export type Treatment = T["treatments"]["Row"];
export type TreatmentSession = T["treatment_sessions"]["Row"];
export type LegendItem = T["body_legend"]["Row"];
export type Product = T["products"]["Row"];
export type Ingredient = T["product_ingredients"]["Row"];
export type Sale = T["sales"]["Row"];
export type SaleItem = T["sale_items"]["Row"];

/* ---------- Marcas corporales ---------- */
export type BodySide = "frente" | "espalda";
export type BodyMark = {
  id: string;
  kind: "flecha" | "texto";
  side: BodySide;
  /** Coordenadas proporcionales (0 a 1) para conservar la posición en cualquier pantalla. */
  x: number;
  y: number;
  angle: number;
  text: string;
  description: string;
};
export const asMarks = (v: unknown): BodyMark[] => (Array.isArray(v) ? (v as BodyMark[]) : []);
/** Copia profunda con identificadores nuevos: la sesión original no se modifica. */
export const copyMarks = (marks: BodyMark[]): BodyMark[] =>
  marks.map((m) => ({ ...m, id: crypto.randomUUID() }));

export const TREATMENT_STATUS: Record<string, string> = {
  en_curso: "En curso",
  pausado: "Pausado",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

/* ---------- Dinero (guaraníes, enteros) ---------- */
export const formatGs = (n?: number | null) => `₲ ${Math.round(n ?? 0).toLocaleString("es-PY")}`;
export const parseGs = (s: string) => {
  const n = parseInt(s.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};
/** Costo unitario: (ingredientes del lote + otros costos) / rendimiento + envase por unidad. */
export const unitCost = (
  p: Pick<Product, "yield_units" | "packaging_cost" | "other_cost">,
  ingredients: Pick<Ingredient, "cost">[],
) => {
  const batch = ingredients.reduce((s, i) => s + Number(i.cost), 0) + Number(p.other_cost);
  const y = Math.max(1, p.yield_units);
  return Math.round((batch + Number(p.packaging_cost) * y) / y);
};

/* ---------- Hooks ---------- */
const q = <R,>(key: unknown[], fn: () => Promise<R>, enabled = true) =>
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useQuery({ queryKey: key, queryFn: fn, enabled });

async function run<R>(p: PromiseLike<{ data: R; error: unknown }>) {
  const { data, error } = await p;
  if (error) throw error;
  return data as NonNullable<R>;
}

export const useClinicalRecord = (patientId: string) =>
  q(["clinical", patientId], () =>
    run(supabase.from("clinical_records").select("*").eq("patient_id", patientId).maybeSingle()) as Promise<ClinicalRecord | null>,
  );
export const useLegend = () =>
  q(["legend"], () => run(supabase.from("body_legend").select("*").order("sort")));
export const useTreatments = (patientId?: string) =>
  q(["treatments", patientId ?? "all"], () => {
    let r = supabase.from("treatments").select("*").order("created_at", { ascending: false });
    if (patientId) r = r.eq("patient_id", patientId);
    return run(r);
  });
export const useSessions = (patientId?: string) =>
  q(["sessions", patientId ?? "all"], () => {
    let r = supabase.from("treatment_sessions").select("*").order("session_date").order("created_at");
    if (patientId) r = r.eq("patient_id", patientId);
    return run(r);
  });
export const useSessionRevisions = (sessionId?: string) =>
  q(
    ["session-revisions", sessionId],
    () =>
      run(
        supabase
          .from("session_revisions")
          .select("*")
          .eq("session_id", sessionId!)
          .order("changed_at", { ascending: false }),
      ),
    Boolean(sessionId),
  );
export const useProducts = () =>
  q(["products"], () => run(supabase.from("products").select("*").order("name")));
export const useIngredients = () =>
  q(["ingredients"], () => run(supabase.from("product_ingredients").select("*")));
export const useSales = () =>
  q(["sales"], () =>
    run(supabase.from("sales").select("*, sale_items(*)").order("sale_date", { ascending: false })),
  );

function useSave(table: keyof T, conflict?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const t = supabase.from(table as "products");
      const { id, ...rest } = row;
      if (conflict) return run(t.upsert(row as never, { onConflict: conflict }).select().single());
      if (id) return run(t.update(rest as never).eq("id", id as string).select().single());
      return run(t.insert(rest as never).select().single());
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
function useDelete(table: keyof T) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as "products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export const useSaveClinical = () => useSave("clinical_records", "patient_id");
export const useSaveLegend = () => useSave("body_legend");
export const useDeleteLegend = () => useDelete("body_legend");
export const useSaveTreatment = () => useSave("treatments");
export const useSaveSession = () => useSave("treatment_sessions");
export const useSaveProduct = () => useSave("products");
export const useDeleteProduct = () => useDelete("products");
export const useSaveIngredient = () => useSave("product_ingredients");
export const useDeleteIngredient = () => useDelete("product_ingredients");

export function useStockMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { product: Product; quantity: number; reason: string }) => {
      await run(
        supabase
          .from("stock_movements")
          .insert({ product_id: input.product.id, quantity: input.quantity, reason: input.reason }),
      );
      await run(
        supabase
          .from("products")
          .update({ stock: input.product.stock + input.quantity })
          .eq("id", input.product.id),
      );
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useRegisterSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { items: { product_id: string; quantity: number }[]; date: string; notes?: string }) =>
      run(
        supabase.rpc("register_sale", {
          _items: input.items as never,
          _sale_date: input.date,
          _patient_id: null as never,
          _notes: input.notes ?? null as never,
        }),
      ),
    onSuccess: () => qc.invalidateQueries(),
  });
}
