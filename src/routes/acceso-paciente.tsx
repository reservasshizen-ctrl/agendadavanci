import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { HeartPulse } from "lucide-react";

export const Route = createFileRoute("/acceso-paciente")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Portal del Paciente | Centro SNS" },
      {
        name: "description",
        content: "Creá tu cuenta o ingresá con tu número de cédula al Portal del Paciente de Centro SNS.",
      },
      { property: "og:title", content: "Portal del Paciente | Centro SNS" },
      { property: "og:description", content: "Tus turnos, recordatorios y novedades de Centro SNS en tu celular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccesoPaciente,
});

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const docEmail = (doc: string) => `ci${onlyDigits(doc)}@paciente.centrosns.app`;
const docPassword = (doc: string) => `SNS-portal-${onlyDigits(doc)}`;

function AccesoPaciente() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "registro">("login");
  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: account } = await supabase
        .from("patient_accounts")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (account) navigate({ to: "/portal" });
    })();
  }, [navigate]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const cedula = onlyDigits(doc);
    if (cedula.length < 4) {
      toast.error("Ingresá tu número de cédula.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: docEmail(cedula),
        password: docPassword(cedula),
      });
      if (error) {
        toast.error("No encontramos una cuenta con esa cédula. Creá tu cuenta primero.");
        setMode("registro");
        return;
      }
      toast.success("¡Bienvenido de vuelta!");
      navigate({ to: "/portal" });
    } finally {
      setLoading(false);
    }
  };

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const cedula = onlyDigits(doc);
    if (!firstName.trim() || !lastName.trim() || cedula.length < 4 || !birthDate) {
      toast.error("Completá nombre, apellido, cédula y fecha de nacimiento.");
      return;
    }
    if (onlyDigits(phone).length < 6) {
      toast.error("Ingresá un número de teléfono válido.");
      return;
    }
    setLoading(true);
    try {
      const email = docEmail(cedula);
      const password = docPassword(cedula);

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/portal`,
          data: {
            display_name: `${firstName.trim()} ${lastName.trim()}`,
            portal_role: "paciente",
          },
        },
      });

      if (signUpError) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          toast.error("Esa cédula ya está registrada. Ingresá desde “Ya tengo cuenta”.");
          setMode("login");
          return;
        }
        toast.info("Ya tenías una cuenta con esa cédula: iniciamos tu sesión.");
        navigate({ to: "/portal" });
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          toast.error("Tu cuenta fue creada. Volvé a ingresar con tu número de cédula.");
          setMode("login");
          return;
        }
      }

      const { error: rpcError } = await supabase.rpc("register_patient_portal", {
        _first_name: firstName.trim(),
        _last_name: lastName.trim(),
        _document_number: cedula,
        _birth_date: birthDate,
        _phone: phone.trim(),
      } as never);
      if (rpcError) {
        if (rpcError.message.includes("YA_REGISTRADO")) {
          toast.error("Esa cédula ya tiene una cuenta activa. Ingresá desde “Ya tengo cuenta”.");
          setMode("login");
          return;
        }
        throw rpcError;
      }

      toast.success("¡Listo! Tu cuenta fue creada.");
      navigate({ to: "/portal" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos crear tu cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <HeartPulse className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Portal del Paciente</h1>
          <p className="mt-1 text-sm text-muted-foreground">Centro SNS</p>
        </div>

        <div className="surface p-5">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-md px-3 py-2 ${mode === "login" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
            >
              Ya tengo cuenta
            </button>
            <button
              type="button"
              onClick={() => setMode("registro")}
              className={`rounded-md px-3 py-2 ${mode === "registro" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
            >
              Crear mi cuenta
            </button>
          </div>

          {mode === "login" ? (
            <form onSubmit={login} className="space-y-4">
              <Field label="Número de cédula">
                <Input
                  value={doc}
                  onChange={(e) => setDoc(e.target.value)}
                  maxLength={20}
                  inputMode="numeric"
                  placeholder="Ej: 4567890"
                />
              </Field>
              <Button type="submit" className="w-full" disabled={loading}>
                Ingresar
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Ingresás solamente con tu número de cédula.
              </p>
            </form>
          ) : (
            <form onSubmit={registrar} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre *">
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} />
                </Field>
                <Field label="Apellido *">
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} />
                </Field>
              </div>
              <Field label="Número de cédula *">
                <Input value={doc} onChange={(e) => setDoc(e.target.value)} maxLength={20} inputMode="numeric" />
              </Field>
              <Field label="Fecha de nacimiento *">
                <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </Field>
              <Button type="submit" className="w-full" disabled={loading}>
                Registrarme e ingresar
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Después vas a ingresar solamente con tu número de cédula.
              </p>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Sos parte del equipo?{" "}
          <Link to="/auth" className="underline">
            Ingresar como personal
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
