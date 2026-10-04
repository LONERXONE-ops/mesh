import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { focusRing, inputClass } from "@/components/mesh/bits";
import { Wordmark } from "@/components/mesh/logo";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isPending) return <AuthShell />;
  if (user) return <Navigate to="/" />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "sign-up") {
        const { error: signUpError } = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        if (signUpError) {
          setError(signUpError.message || "Could not create the account.");
          return;
        }
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message || "Could not sign in.");
          return;
        }
      }
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </p>
        <h1 className="mt-2 text-xl font-medium">Use Mesh with your account</h1>
        <p className="mt-1 text-sm text-muted">One task, multiple models. Your session stays on this device.</p>
        <div className="mt-5 space-y-3">
          {mode === "sign-up" ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Name</span>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Email</span>
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Password</span>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className={cn("mt-5 h-11 w-full rounded-full bg-inverse text-sm font-medium text-inverse-fg disabled:opacity-60", focusRing)}
        >
          {busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          className={cn("mt-3 h-11 w-full text-sm text-muted", focusRing)}
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setError("");
          }}
        >
          {mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}

function AuthShell({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 text-fg">
      <Wordmark className="mb-6" />
      {children ?? <p className="text-sm text-muted">Checking session…</p>}
    </div>
  );
}
