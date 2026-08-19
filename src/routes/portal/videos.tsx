import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { embedUrl, usePublishedContent, type Content } from "@/lib/portal";
import { PlayCircle } from "lucide-react";

export const Route = createFileRoute("/portal/videos")({
  head: () => ({
    meta: [
      { title: "Videos | Portal del Paciente Centro SNS" },
      { name: "description", content: "Videos informativos y educativos publicados por Centro SNS." },
      { property: "og:title", content: "Videos | Portal del Paciente Centro SNS" },
      { property: "og:description", content: "Videos informativos y educativos de Centro SNS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Videos,
});

function Videos() {
  const { data: all = [], isLoading } = usePublishedContent();
  const [open, setOpen] = useState<Content | null>(null);
  const videos = all.filter((c) => c.category === "videos" || c.video_url);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Videos</h1>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {!isLoading && videos.length === 0 && (
        <p className="surface p-6 text-center text-sm text-muted-foreground">Todavía no hay videos publicados.</p>
      )}

      <div className="space-y-3">
        {videos.map((v) => (
          <button key={v.id} onClick={() => setOpen(v)} className="surface w-full overflow-hidden text-left">
            <div className="relative">
              {v.image_url ? (
                <img src={v.image_url} alt={v.title} className="h-40 w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-32 w-full bg-muted" />
              )}
              <PlayCircle className="absolute inset-0 m-auto size-12 text-primary-foreground drop-shadow" />
            </div>
            <div className="p-4">
              <h2 className="font-medium">{v.title}</h2>
              {v.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{v.description}</p>}
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-background/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-lg py-6">
            <h2 className="mb-3 text-lg font-semibold">{open.title}</h2>
            {embedUrl(open.video_url) ? (
              <div className="aspect-video w-full overflow-hidden rounded-xl">
                <iframe
                  src={embedUrl(open.video_url)!}
                  title={open.title}
                  className="size-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : open.video_url ? (
              <video src={open.video_url} controls className="w-full rounded-xl" />
            ) : (
              <p className="text-sm text-muted-foreground">Este contenido no tiene video asociado.</p>
            )}
            {open.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{open.description}</p>
            )}
            <button onClick={() => setOpen(null)} className="mt-6 w-full rounded-lg border border-border py-2 text-sm">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
