import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = user.trim().toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
    if (!u || !password.trim()) {
      toast.error("Ingresá tu usuario y contraseña.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${u}@personal.centrosns.app`,
        password: `sns-staff-${password.trim()}`,
      });
      if (error) throw new Error("Usuario o contraseña incorrectos");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
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
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Usuario</Label>
            <Input value={user} onChange={(e) => setUser(e.target.value)} maxLength={40} autoComplete="username" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            Ingresar
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acceso restringido al personal autorizado de Centro SNS.
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          ¿Sos paciente?{" "}
          <Link to="/acceso-paciente" className="underline">
            Ingresá al Portal del Paciente
          </Link>
        </p>
      </div>
    </main>
  );
}
