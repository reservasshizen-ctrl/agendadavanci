import type { Database } from "@/integrations/supabase/types";

export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Message = Database["public"]["Tables"]["appointment_messages"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type StatusHistory = Database["public"]["Tables"]["patient_status_history"]["Row"];

export type AppointmentWithPatient = Appointment & { patient: Patient };

/* ---------- Estados ---------- */

export const PATIENT_STATUSES = [
  "activo",
  "en_revision",
  "pendiente_revision",
  "abandono",
  "falta",
  "falta_enfermedad",
  "falta_otra_causa",
  "reprogramado",
] as const;

export const APPOINTMENT_STATUSES = [
  "pendiente",
  "confirmado",
  "asistio",
  "falta",
  "falta_enfermedad",
  "falta_otra_causa",
  "cancelo",
  "reprogramo",
] as const;

export const APPOINTMENT_TYPES = [
  "primera_consulta",
  "consulta",
  "revision",
  "control",
  "otro",
] as const;

type Tone = "neutral" | "success" | "info" | "warning" | "danger";

export const LABELS: Record<string, string> = {
  activo: "Activo",
  en_revision: "En revisión",
  pendiente_revision: "Pendiente de revisión",
  abandono: "Abandono",
  falta: "Falta",
  falta_enfermedad: "Falta por enfermedad",
  falta_otra_causa: "Falta por otra causa",
  reprogramado: "Reprogramado",
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  asistio: "Asistió",
  cancelo: "Canceló",
  reprogramo: "Reprogramó",
  primera_consulta: "Primera consulta",
  consulta: "Consulta",
  revision: "Revisión",
  control: "Control",
  otro: "Otro",
};

export const TONES: Record<string, Tone> = {
  activo: "success",
  en_revision: "info",
  pendiente_revision: "warning",
  abandono: "danger",
  falta: "danger",
  falta_enfermedad: "danger",
  falta_otra_causa: "danger",
  reprogramado: "warning",
  pendiente: "warning",
  confirmado: "success",
  asistio: "success",
  cancelo: "neutral",
  reprogramo: "warning",
};

export const label = (value?: string | null) =>
  value ? (LABELS[value] ?? value.replace(/_/g, " ")) : "—";

export const tone = (value?: string | null): Tone => (value ? (TONES[value] ?? "neutral") : "neutral");

/* ---------- Fechas ---------- */

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const addDaysISO = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, (m ?? 1) - 1, (d ?? 1) + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const daysBetween = (fromISO: string, toISO: string) => {
  const a = new Date(`${fromISO}T00:00:00`).getTime();
  const b = new Date(`${toISO}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
};

export const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const formatShortDate = (iso?: string | null) => {
  if (!iso) return "—";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

export const formatTime = (time?: string | null) => (time ? time.slice(0, 5) : "—");

export const age = (birth?: string | null) => {
  if (!birth) return null;
  const today = new Date();
  const [y, m, d] = birth.split("-").map(Number);
  let a = today.getFullYear() - (y ?? 0);
  const monthDiff = today.getMonth() + 1 - (m ?? 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < (d ?? 1))) a--;
  return a;
};

/** Días hasta el próximo cumpleaños (0 = hoy). */
export const daysToBirthday = (birth?: string | null) => {
  if (!birth) return null;
  const [, m, d] = birth.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), (m ?? 1) - 1, d ?? 1);
  if (next.getTime() < today.getTime()) next = new Date(today.getFullYear() + 1, (m ?? 1) - 1, d ?? 1);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
};

/* ---------- WhatsApp ---------- */

const DEFAULT_COUNTRY_CODE = "595";

/** Normaliza a solo dígitos con código de país (Paraguay por defecto). */
export const normalizePhone = (raw?: string | null) => {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  else if (digits.length <= 9) digits = DEFAULT_COUNTRY_CODE + digits;
  return digits;
};

export const waLink = (phone?: string | null, message?: string) => {
  const number = normalizePhone(phone);
  if (!number) return null;
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

export const patientPhone = (p: Pick<Patient, "whatsapp" | "phone">) => p.whatsapp || p.phone || "";

export const appointmentMessage = (name: string, dateISO: string, time: string) =>
  `Hola, ${name} 👋

Te escribimos desde Centro SNS para confirmar tu horario.

📅 Fecha: ${formatDate(dateISO)}
🕐 Hora: ${formatTime(time)}

Te esperamos en Centro SNS.

Por favor, confirmá la recepción de este mensaje. 🙌`;

export const reviewMessage = (name: string, dateISO: string, time?: string | null) =>
  `Hola, ${name} 👋

Te escribimos desde Centro SNS para recordarte que tenés programada tu revisión.

📅 Fecha: ${formatDate(dateISO)}
🕐 Hora: ${formatTime(time ?? "")}

Te esperamos en Centro SNS. 🙌`;

export const birthdayMessage = (name: string) =>
  `🎉 ¡Feliz cumpleaños, ${name}!

Desde todo el equipo de Centro SNS queremos desearte un muy feliz cumpleaños. 🥳

Que tengas un excelente día y que este nuevo año esté lleno de salud, bienestar y buenos momentos.

¡Un abrazo de parte de Centro SNS! ❤️`;

export const openWhatsApp = (phone?: string | null, message?: string) => {
  const url = waLink(phone, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
};
