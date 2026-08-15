import type { Patient } from "./sns";

const norm = (v?: string | null) =>
  (v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Busca por nombre, apellido, nombre completo, cédula o teléfono. */
export function matchPatient(p: Patient, query: string) {
  const q = norm(query).trim();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  const haystack = [p.first_name, p.last_name, p.full_name].map(norm);
  if (haystack.some((h) => h.includes(q))) return true;
  if (digits.length >= 3) {
    const nums = [p.document_number, p.phone, p.whatsapp].map((v) => (v ?? "").replace(/\D/g, ""));
    if (nums.some((n) => n && n.includes(digits))) return true;
  }
  return false;
}
