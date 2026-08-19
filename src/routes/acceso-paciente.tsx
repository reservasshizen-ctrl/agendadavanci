import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { HeartPulse } from "lucide-react";

export const Route = createFileRoute("/acceso-paciente")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Portal del Paciente | Centro SNS" },
      {
        name: "description",
        content: "Creá tu cuenta o ingresá al Portal del Paciente de Centro SNS para ver tus turnos y novedades.",
      },
      { property: "og:title", content: "Portal del Paciente | Centro SNS" },
      { property: "og:description", content: "Tus turnos, recordatorios y novedades de Centro SNS en tu celular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccesoPaciente,
});

type Form = {
  first_name: string;
  last_name: string;
  document_number: string;
  phone: string;
  whatsapp: string;
  birth_date: string;
  email: string;
  password: string;
  address: string;
  city: string;
  notes: string;
};

const EMPTY: Form = {
  first_name: "",
  last_name: "",
  document_number: "",
  phone: "",
  whatsapp: "",
  birth_date: "",
  email: "",
  password: "",
  address: "",
  city: "",
  notes: "",
};

function AccesoPaciente() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "registro">("login");
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setHasSession(true);
      const { data: account } = await supabase
        .from("patient_accounts")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (account) navigate({ to: "/portal" });
      else {
        setMode("registro");
        setForm((f) => ({ ...f, email: data.user?.email ?? "" }));
      }
    })();
  }, [navigate]);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      if (error) throw error;
      navigate({ to: "/portal" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos iniciar tu sesión");
    } finally {
      setLoading(false);
    }
  };

  const registrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const required: [keyof Form, string][] = [
      ["first_name", "Nombre"],
      ["last_name", "Apellido"],
      ["document_number", "Número de cédula"],
      ["phone", "Número de teléfono"],
      ["whatsapp", "Número de WhatsApp"],
      ["birth_date", "Fecha de nacimiento"],
    ];
    for (const [key, label] of required) {
      if (!form[key].trim()) {
        toast.error(`Completá: ${label}`);
        return;
      }
    }
    if (!hasSession && (!form.email.trim() || form.password.length < 6)) {
      toast.error("Necesitamos tu correo y una contraseña de al menos 6 caracteres para crear tu cuenta.");
      return;
    }

    setLoading(true);
    try {
      const { data: exists, error: existsError } = await supabase.rpc("patient_exists", {
        _document: form.document_number.trim(),
        _phone: form.whatsapp.trim() || form.phone.trim(),
      });
      if (existsError) throw existsError;
      if (exists && !hasSession) {
        toast.error("Ya encontramos un registro asociado a estos datos. Iniciá sesión para acceder a tu información.");
        setMode("login");
        setLoading(false);
        return;
      }

      if (!hasSession) {
        const { error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/portal`,
            data: {
              display_name: `${form.first_name} ${form.last_name}`.trim(),
              portal_role: "paciente",
            },
          },
        });
        if (error) throw error;
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: form.email.trim(),
            password: form.password,
          });
          if (signInError) {
            toast.success("Cuenta creada. Revisá tu correo para confirmarla y luego ingresá.");
            setMode("login");
            setLoading(false);
            return;
          }
        }
      }

      const { error: rpcError } = await supabase.rpc("register_patient_account", {
        _first_name: form.first_name.trim(),
        _last_name: form.last_name.trim(),
        _document_number: form.document_number.trim(),
        _phone: form.phone.trim(),
        _whatsapp: form.whatsapp.trim(),
        _birth_date: form.birth_date,
        _email: form.email.trim() || undefined,
        _address: form.address.trim() || undefined,
        _city: form.city.trim() || undefined,
        _notes: form.notes.trim() || undefined,
      });
      if (rpcError) {
        if (rpcError.message.includes("DUPLICADO")) {
          toast.error("Ya encontramos un registro asociado a estos datos. Iniciá sesión para acceder a tu información.");
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
              <Field label="Correo electrónico">
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={255} />
              </Field>
              <Field label="Contraseña">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  maxLength={72}
                />
              </Field>
              <Button type="submit" className="w-full" disabled={loading}>
                Ingresar
              </Button>
            </form>
          ) : (
            <form onSubmit={registrar} className="space-y-4">
              {hasSession && (
                <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  Completá tus datos para terminar de crear tu ficha en Centro SNS.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre *">
                  <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} maxLength={60} />
                </Field>
                <Field label="Apellido *">
                  <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} maxLength={60} />
                </Field>
              </div>
              <Field label="Número de cédula *">
                <Input
                  value={form.document_number}
                  onChange={(e) => set("document_number", e.target.value)}
                  maxLength={20}
                  inputMode="numeric"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Teléfono *">
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={25} inputMode="tel" />
                </Field>
                <Field label="WhatsApp *">
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => set("whatsapp", e.target.value)}
                    maxLength={25}
                    inputMode="tel"
                  />
                </Field>
              </div>
              <Field label="Fecha de nacimiento *">
                <Input type="date" value={form.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
              </Field>
              <Field label="Correo electrónico *">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  maxLength={255}
                  disabled={hasSession}
                />
              </Field>
              {!hasSession && (
                <Field label="Contraseña *">
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    maxLength={72}
                  />
                </Field>
              )}
              <Field label="Dirección">
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={160} />
              </Field>
              <Field label="Ciudad">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={80} />
              </Field>
              <Field label="Observaciones">
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} rows={3} />
              </Field>
              <Button type="submit" className="w-full" disabled={loading}>
                Crear mi cuenta
              </Button>
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
