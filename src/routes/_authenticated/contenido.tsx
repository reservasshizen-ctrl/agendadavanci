import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CONTENT_CATEGORIES,
  CONTENT_CATEGORY_LABELS,
  useAllContent,
  useDeleteContent,
  useSaveContent,
  type Content,
} from "@/lib/portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/contenido")({
  head: () => ({
    meta: [
      { title: "Contenido del portal | Centro SNS" },
      { name: "description", content: "Publicá novedades, consejos y videos para los pacientes de Centro SNS." },
      { property: "og:title", content: "Contenido del portal | Centro SNS" },
      { property: "og:description", content: "Gestión de novedades y videos del Portal del Paciente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContenidoPage,
});

type Draft = {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  video_url: string;
  category: string;
  published: boolean;
  featured: boolean;
  notify: boolean;
};

const EMPTY: Draft = {
  title: "",
  description: "",
  image_url: "",
  video_url: "",
  category: "novedades",
  published: false,
  featured: false,
  notify: false,
};

function ContenidoPage() {
  const { data: items = [], isLoading } = useAllContent();
  const save = useSaveContent();
  const remove = useDeleteContent();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const edit = (c: Content) => {
    setDraft({
      id: c.id,
      title: c.title,
      description: c.description ?? "",
      image_url: c.image_url ?? "",
      video_url: c.video_url ?? "",
      category: c.category,
      published: c.published,
      featured: c.featured,
      notify: false,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }
    try {
      await save.mutateAsync({
        ...(draft.id ? { id: draft.id } : {}),
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        image_url: draft.image_url.trim() || null,
        video_url: draft.video_url.trim() || null,
        category: draft.category,
        published: draft.published,
        featured: draft.featured,
        notify_patients: draft.notify,
        published_at: draft.published ? new Date().toISOString() : null,
      } as never);
      toast.success(draft.id ? "Publicación actualizada." : "Publicación creada.");
      setOpen(false);
      setDraft(EMPTY);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contenido del portal</h1>
          <p className="text-sm text-muted-foreground">Novedades, consejos y videos para los pacientes.</p>
        </div>
        <Button
          onClick={() => {
            setDraft(EMPTY);
            setOpen(true);
          }}
        >
          <Plus className="mr-1.5 size-4" /> Nueva publicación
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {!isLoading && items.length === 0 && (
        <p className="surface p-8 text-center text-sm text-muted-foreground">Todavía no hay publicaciones.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((c) => (
          <div key={c.id} className="surface overflow-hidden">
            {c.image_url && <img src={c.image_url} alt={c.title} className="h-32 w-full object-cover" loading="lazy" />}
            <div className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  {CONTENT_CATEGORY_LABELS[c.category] ?? c.category}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    c.published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.published ? "Publicado" : "Borrador"}
                </span>
                {c.featured && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Destacado</span>}
              </div>
              <p className="font-medium">{c.title}</p>
              {c.description && <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => edit(c)}>
                  <Pencil className="mr-1.5 size-3.5" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("¿Eliminar esta publicación?")) remove.mutate(c.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar publicación" : "Nueva publicación"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Título</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={150}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Descripción</Label>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={5}
                maxLength={4000}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Imagen (URL)</Label>
              <Input value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Video (URL de YouTube, Vimeo o mp4)</Label>
              <Input value={draft.video_url} onChange={(e) => setDraft({ ...draft, video_url: e.target.value })} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Categoría</Label>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {CONTENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CONTENT_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 text-sm">
              <Check label="Publicado" checked={draft.published} onChange={(v) => setDraft({ ...draft, published: v })} />
              <Check label="Destacado" checked={draft.featured} onChange={(v) => setDraft({ ...draft, featured: v })} />
              <Check
                label="Notificar a los pacientes al publicar"
                checked={draft.notify}
                onChange={(v) => setDraft({ ...draft, notify: v })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={save.isPending}>
              Guardar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4" />
      {label}
    </label>
  );
}
