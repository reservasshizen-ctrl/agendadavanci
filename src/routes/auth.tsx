import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { HeartPulse } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ingresar | Centro SNS" },
      { name: "description", content: "Acceso del personal al sistema de agenda y pacientes de Centro SNS." },
      { property: "og:title", content: "Ingresar | Centro SNS" },
      { property: "og:description", content: "Acceso del personal al sistema de agenda y pacientes de Centro SNS." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Ingresá un email válido y una contraseña de al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name.trim() || email.trim() },
          },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisá tu correo si se solicita confirmación.");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("No se pudo iniciar sesión con Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <HeartPulse className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Centro SNS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Agenda y gestión de pacientes</p>
        </div>

        <form onSubmit={submit} className="surface space-y-4 p-6">
          {mode === "signup" && (
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
          )}
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {mode === "login" ? "Ingresar" : "Crear cuenta"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={google}>
            Continuar con Google
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? "¿No tenés cuenta? Registrate" : "Ya tengo una cuenta"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acceso restringido al personal autorizado de Centro SNS.
        </p>
      </div>
    </main>
  );
}
