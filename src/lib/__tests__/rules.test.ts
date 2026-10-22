import { describe, expect, test } from "bun:test";
import { unitCost, copyMarks, type BodyMark } from "../clinical";
import { overlappingAppointments } from "../sns";

describe("costo unitario", () => {
  test("(ingredientes + otros) / rendimiento + envase", () => {
    expect(unitCost({ yield_units: 10, packaging_cost: 2000, other_cost: 5000 }, [{ cost: 30000 }, { cost: 15000 }])).toBe(7000);
  });
});

describe("superposición de turnos", () => {
  const base = { id: "a", time: "09:00:00", duration: 30, professional: "Dra. Ruiz", status: "pendiente" };
  test("mismo profesional y horario pisado", () => {
    expect(overlappingAppointments([base], { time: "09:15", duration: 30, professional: "dra. ruiz" })).toHaveLength(1);
  });
  test("turno contiguo no se superpone", () => {
    expect(overlappingAppointments([base], { time: "09:30", duration: 30, professional: "Dra. Ruiz" })).toHaveLength(0);
  });
  test("otro profesional no se superpone", () => {
    expect(overlappingAppointments([base], { time: "09:00", duration: 30, professional: "Lic. Gómez" })).toHaveLength(0);
  });
});

describe("copiar marcas", () => {
  test("no modifica la sesión original", () => {
    const orig: BodyMark[] = [{ id: "1", kind: "texto", side: "frente", x: 0.5, y: 0.5, angle: 0, text: "H", description: "" }];
    const copy = copyMarks(orig);
    copy[0]!.text = "AR";
    expect(orig[0]!.text).toBe("H");
    expect(copy[0]!.id).not.toBe("1");
  });
});
