import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CONTENT_CATEGORY_LABELS, usePublishedContent, type Content } from "@/lib/portal";
import { Newspaper, Star } from "lucide-react";

export const Route = createFileRoute("/portal/novedades")({
  head: () => ({
    meta: [
      { title: "Novedades | Portal del Paciente Centro SNS" },
      { name: "description", content: "Novedades, consejos de salud e información importante de Centro SNS." },
      { property: "og:title", content: "Novedades | Portal del Paciente Centro SNS" },
      { property: "og:description", content: "Consejos de salud e información importante de Centro SNS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Novedades,
});

function Novedades() {
  const { data: all = [], isLoading } = usePublishedContent();
  const [category, setCategory] = useState<string>("todas");
  const [open, setOpen] = useState<Content | null>(null);

  const items = all.filter((c) => c.category !== "videos" && (category === "todas" || c.category === category));
  const categories = ["todas", ...Array.from(new Set(all.filter((c) => c.category !== "videos").map((c) => c.category)))];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Novedades</h1>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${
              category === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {c === "todas" ? "Todas" : (CONTENT_CATEGORY_LABELS[c] ?? c)}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {!isLoading && items.length === 0 && (
        <p className="surface p-6 text-center text-sm text-muted-foreground">Todavía no hay publicaciones.</p>
      )}

      <div className="space-y-3">
        {items.map((c) => (
          <button key={c.id} onClick={() => setOpen(c)} className="surface w-full overflow-hidden text-left">
            {c.image_url ? (
              <img src={c.image_url} alt={c.title} className="h-40 w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-24 items-center justify-center bg-muted">
                <Newspaper className="size-6 text-muted-foreground" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {CONTENT_CATEGORY_LABELS[c.category] ?? c.category}
                </span>
                {c.featured && <Star className="size-3.5 text-primary" />}
              </div>
              <h2 className="mt-2 font-medium">{c.title}</h2>
              {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 overflow-y-auto bg-background/95 p-4 backdrop-blur"
          onClick={() => setOpen(null)}
        >
          <div className="mx-auto max-w-lg py-6" onClick={(e) => e.stopPropagation()}>
            {open.image_url && (
              <img src={open.image_url} alt={open.title} className="mb-4 w-full rounded-xl object-cover" />
            )}
            <h2 className="text-xl font-semibold">{open.title}</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{open.description}</p>
            <button onClick={() => setOpen(null)} className="mt-6 w-full rounded-lg border border-border py-2 text-sm">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
