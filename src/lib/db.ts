import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Appointment, AppointmentWithPatient, Patient } from "./sns";

export type Loose<T> = { [K in keyof T]?: T[K] | undefined } & { id?: string | undefined };

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries();
};

/* ---------- Pacientes ---------- */

export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: async (): Promise<Patient[]> => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("last_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Vista de la ficha: activos, archivados o eliminados. */
export type PatientScope = "activos" | "archivados" | "eliminados" | "todos";

export const inScope = (p: Patient, scope: PatientScope) => {
  const deleted = Boolean(p.deleted_at);
  if (scope === "eliminados") return deleted;
  if (deleted) return false;
  if (p.review_status === "pendiente") return false;
  if (scope === "archivados") return p.archived;
  if (scope === "activos") return !p.archived;
  return true;
};

export function useReviewRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; approve: boolean }) => {
      const { error } = await supabase
        .from("patients")
        .update(
          input.approve
            ? { review_status: "aprobado" }
            : { review_status: "rechazado", archived: true },
        )
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function usePatientAudit(patientId: string) {
  return useQuery({
    queryKey: ["patient-audit", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_audit_log")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSetPatientArchived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) => {
      const { error } = await supabase.from("patients").update({ archived: input.archived }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Eliminación lógica: conserva turnos, revisiones e historial. */
export function useSetPatientDeleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; deleted: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("patients")
        .update({
          deleted_at: input.deleted ? new Date().toISOString() : null,
          deleted_by: input.deleted ? (userData.user?.id ?? null) : null,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: async (): Promise<Patient | null> => {
      const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePatientTimeline(patientId: string) {
  return useQuery({
    queryKey: ["patient-timeline", patientId],
    queryFn: async () => {
      const [appointments, messages, reviews, attendance, history] = await Promise.all([
        supabase.from("appointments").select("*").eq("patient_id", patientId).order("date", { ascending: false }),
        supabase.from("appointment_messages").select("*").eq("patient_id", patientId).order("sent_at", { ascending: false }),
        supabase.from("reviews").select("*").eq("patient_id", patientId).order("review_date", { ascending: false }),
        supabase.from("attendance").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
        supabase.from("patient_status_history").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
      ]);
      return {
        appointments: appointments.data ?? [],
        messages: messages.data ?? [],
        reviews: reviews.data ?? [],
        attendance: attendance.data ?? [],
        history: history.data ?? [],
      };
    },
  });
}

export function useSavePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Loose<Patient>) => {
      const { id, ...rest } = values;
      if (id) {
        const { data, error } = await supabase.from("patients").update(rest as never).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("patients")
        .insert(rest as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useChangePatientStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      patient: Patient;
      newStatus: string;
      reason?: string;
      notes?: string;
      extra?: Partial<Patient>;
    }) => {
      const { patient, newStatus, reason, notes, extra } = input;
      const { error } = await supabase
        .from("patients")
        .update({ status: newStatus, ...(extra ?? {}) })
        .eq("id", patient.id);
      if (error) throw error;
      await supabase.from("patient_status_history").insert({
        patient_id: patient.id,
        previous_status: patient.status,
        new_status: newStatus,
        reason: reason ?? null,
        notes: notes ?? null,
      });
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/* ---------- Turnos ---------- */

export function useAppointments(fromISO?: string, toISO?: string) {
  return useQuery({
    queryKey: ["appointments", fromISO ?? "all", toISO ?? "all"],
    queryFn: async (): Promise<AppointmentWithPatient[]> => {
      let query = supabase
        .from("appointments")
        .select("*, patient:patients(*)")
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (fromISO) query = query.gte("date", fromISO);
      if (toISO) query = query.lte("date", toISO);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as AppointmentWithPatient[];
    },
  });
}

export function useSaveAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Loose<Appointment>) => {
      const { id, ...rest } = values;
      if (id) {
        const { error } = await supabase.from("appointments").update(rest as never).eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("appointments").insert(rest as never);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useMarkScheduleSent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appointment: AppointmentWithPatient) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      const { error } = await supabase
        .from("appointments")
        .update({ schedule_sent: true, schedule_sent_at: new Date().toISOString(), schedule_sent_by: userId })
        .eq("id", appointment.id);
      if (error) throw error;
      await supabase.from("appointment_messages").insert({
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        message_type: "appointment_confirmation",
        sent_by: userId,
        status: "enviado",
      });
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useSetAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { appointment: AppointmentWithPatient; status: string; reason?: string; notes?: string }) => {
      const { appointment, status, reason, notes } = input;
      const { error } = await supabase.from("appointments").update({ status }).eq("id", appointment.id);
      if (error) throw error;
      await supabase.from("attendance").insert({
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        status,
        reason: reason ?? null,
        notes: notes ?? null,
      });
      if (status.startsWith("falta")) {
        await supabase.from("patients").update({ status }).eq("id", appointment.patient_id);
        await supabase.from("patient_status_history").insert({
          patient_id: appointment.patient_id,
          previous_status: appointment.patient?.status ?? null,
          new_status: status,
          reason: reason ?? null,
          notes: notes ?? null,
        });
      }
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/* ---------- Revisiones ---------- */

export function useReviews() {
  return useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, patient:patients(*)")
        .order("review_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as (Database0Review & { patient: Patient })[];
    },
  });
}

type Database0Review = import("./sns").Review;

export function useSaveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      patient: Patient;
      review_date: string;
      review_time?: string | null;
      professional?: string | null;
      notes?: string | null;
      status?: string;
    }) => {
      const { patient, ...rest } = input;
      const { error } = await supabase.from("reviews").insert({
        patient_id: patient.id,
        review_date: rest.review_date,
        review_time: rest.review_time || null,
        professional: rest.professional || null,
        notes: rest.notes || null,
        status: rest.status ?? "pendiente",
      });
      if (error) throw error;
      await supabase
        .from("patients")
        .update({
          status: "en_revision",
          next_review_date: rest.review_date,
          next_review_time: rest.review_time || null,
          next_review_reason: rest.notes || null,
        })
        .eq("id", patient.id);
      await supabase.from("patient_status_history").insert({
        patient_id: patient.id,
        previous_status: patient.status,
        new_status: "en_revision",
        reason: "Revisión registrada",
        notes: rest.notes ?? null,
      });
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useMarkReviewReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reviewId: string; patientId: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("reviews")
        .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
        .eq("id", input.reviewId);
      if (error) throw error;
      await supabase.from("appointment_messages").insert({
        patient_id: input.patientId,
        message_type: "review_reminder",
        sent_by: userData.user?.id ?? null,
        status: "enviado",
      });
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/* ---------- Mensajes ---------- */

export function useMessages() {
  return useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointment_messages")
        .select("*, patient:patients(*)")
        .order("sent_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as (import("./sns").Message & { patient: Patient })[];
    },
  });
}

export function useLogMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { patientId: string; type: string; notes?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("appointment_messages").insert({
        patient_id: input.patientId,
        message_type: input.type,
        sent_by: userData.user?.id ?? null,
        status: "enviado",
        notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}
