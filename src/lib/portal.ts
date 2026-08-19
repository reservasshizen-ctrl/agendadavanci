import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Patient } from "./sns";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Content = Database["public"]["Tables"]["content"]["Row"];
export type PatientAccount = Database["public"]["Tables"]["patient_accounts"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const CONTENT_CATEGORIES = [
  "novedades",
  "salud_bienestar",
  "centro_sns",
  "consejos",
  "videos",
  "informacion_importante",
] as const;

export const CONTENT_CATEGORY_LABELS: Record<string, string> = {
  novedades: "Novedades",
  salud_bienestar: "Salud y bienestar",
  centro_sns: "Centro SNS",
  consejos: "Consejos",
  videos: "Videos",
  informacion_importante: "Información importante",
};

export const CENTER_ADDRESS = "Centro SNS";

/* ---------- Roles ---------- */

export function useMyRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: async (): Promise<AppRole[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (error) throw error;
      return (data ?? []).map((r) => r.role);
    },
  });
}

export async function fetchRoles(): Promise<AppRole[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
  return (data ?? []).map((r) => r.role as AppRole);
}

export const isStaffRoles = (roles: AppRole[]) => roles.includes("admin") || roles.includes("recepcion");

/* ---------- Cuenta del paciente ---------- */

export function useMyPatient() {
  return useQuery({
    queryKey: ["my-patient"],
    queryFn: async (): Promise<Patient | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("patient_accounts")
        .select("patient:patients(*)")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data?.patient as Patient | undefined) ?? null;
    },
  });
}

export function useUpdateMyPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; values: Partial<Patient> }) => {
      const { error } = await supabase.from("patients").update(input.values as never).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* ---------- Turnos del paciente ---------- */

export function useMyAppointments(patientId?: string) {
  return useQuery({
    queryKey: ["my-appointments", patientId],
    enabled: Boolean(patientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", patientId!)
        .order("date", { ascending: false })
        .order("time", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyReviews(patientId?: string) {
  return useQuery({
    queryKey: ["my-reviews", patientId],
    enabled: Boolean(patientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("patient_id", patientId!)
        .order("review_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ---------- Notificaciones ---------- */

export function useMyNotifications(patientId?: string) {
  return useQuery({
    queryKey: ["my-notifications", patientId],
    enabled: Boolean(patientId),
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patientId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("patient_id", patientId)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-notifications"] }),
  });
}

/* ---------- Contenido ---------- */

export function usePublishedContent(category?: string) {
  return useQuery({
    queryKey: ["content-published", category ?? "all"],
    queryFn: async (): Promise<Content[]> => {
      let q = supabase
        .from("content")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAllContent() {
  return useQuery({
    queryKey: ["content-all"],
    queryFn: async (): Promise<Content[]> => {
      const { data, error } = await supabase
        .from("content")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Content> & { id?: string }) => {
      const { id, ...rest } = values;
      if (id) {
        const { error } = await supabase.from("content").update(rest as never).eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("content").insert(rest as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* ---------- Envío de notificaciones (administración) ---------- */

export type NotificationAudience = "todos" | "activos" | "en_revision" | "seleccionados";

export function useSendNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      audience: NotificationAudience;
      patientIds?: string[];
      title: string;
      message: string;
      imageUrl?: string | null;
      link?: string | null;
    }) => {
      let targets: string[] = input.patientIds ?? [];
      if (input.audience !== "seleccionados") {
        let q = supabase.from("patients").select("id").eq("archived", false);
        if (input.audience === "activos") q = q.eq("status", "activo");
        if (input.audience === "en_revision") q = q.eq("status", "en_revision");
        const { data, error } = await q;
        if (error) throw error;
        targets = (data ?? []).map((p) => p.id);
      }
      if (!targets.length) throw new Error("No hay destinatarios para esta notificación.");
      const rows = targets.map((patient_id) => ({
        patient_id,
        title: input.title,
        message: input.message,
        type: "aviso",
        image_url: input.imageUrl || null,
        link: input.link || null,
      }));
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) throw error;
      return targets.length;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/* ---------- Notificaciones push ---------- */

export async function registerPushDevice(patientId: string) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { ok: false, reason: "unsupported" as const };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" as const };

  // Identificador local del dispositivo. Cuando se integre un proveedor push
  // (FCM / OneSignal / Web Push), se reemplaza por el token real del servicio.
  const key = "sns_device_token";
  let token = localStorage.getItem(key);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(key, token);
  }
  const { error } = await supabase
    .from("push_devices")
    .upsert(
      { patient_id: patientId, device_token: token, platform: "web", active: true },
      { onConflict: "patient_id,device_token" },
    );
  if (error) return { ok: false, reason: "error" as const };
  return { ok: true, reason: "granted" as const };
}

/* ---------- Utilidades ---------- */

export function embedUrl(videoUrl?: string | null) {
  if (!videoUrl) return null;
  const yt = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt?.[1]) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = videoUrl.match(/vimeo\.com\/(\d+)/);
  if (vimeo?.[1]) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export function calendarLink(input: { title: string; dateISO: string; time: string; details?: string }) {
  const [h, m] = input.time.split(":");
  const start = new Date(`${input.dateISO}T${h ?? "09"}:${m ?? "00"}:00`);
  const end = new Date(start.getTime() + 30 * 60_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: input.details ?? "",
    location: CENTER_ADDRESS,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
