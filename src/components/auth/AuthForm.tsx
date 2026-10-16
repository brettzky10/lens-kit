"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clapperboard, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

function safeRedirect(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/flow";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeRedirect(searchParams.get("redirect"));
  const isSignUp = mode === "signup";

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(
    searchParams.get("error") === "auth_callback_failed"
      ? "That sign-in link didn't work or has expired. Try again."
      : null
  );
  const [checkEmail, setCheckEmail] = React.useState(false);

  const callbackUrl = () => `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (isSignUp && password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = await createClient();

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl(), data: { full_name: name.trim() } },
      });
      setLoading(false);
      if (error) return setError(error.message);
      // Supabase returns a user with no identities when the email is already registered.
      if (data.user && data.user.identities?.length === 0) {
        return setError("An account with this email already exists. Sign in instead.");
      }
      if (data.session) {
        router.replace(redirect);
        router.refresh();
      } else {
        setCheckEmail(true); // email confirmation is on
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return setError(error.message);
    }
    router.replace(redirect);
    router.refresh();
  }

  async function handleGoogle() {
    setError(null);
    setOauthLoading(true);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setOauthLoading(false);
      setError(error.message);
    }
  }

  const otherHref = `${isSignUp ? "/signin" : "/signup"}?redirect=${encodeURIComponent(redirect)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2 text-primary">
          <Clapperboard className="h-5 w-5" />
          <span className="text-sm font-semibold text-foreground">CineFlow</span>
        </div>

        {checkEmail ? (
          <div className="text-center">
            <MailCheck className="mx-auto mb-4 h-8 w-8 text-primary" />
            <h1 className="mb-2 text-xl font-semibold text-foreground">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to <span className="text-foreground">{email}</span>. Open it to finish
              creating your account.
            </p>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-center text-xl font-semibold text-foreground">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              {isSignUp ? "Start with free monthly credits." : "Sign in to continue to your projects."}
            </p>

            {error && (
              <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="button" variant="outline" className="w-full" disabled={oauthLoading || loading} onClick={handleGoogle}>
              {oauthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue with Google
            </Button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              or use email
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  minLength={isSignUp ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || oauthLoading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignUp ? "Create account" : "Sign in"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "New to CineFlow?"}{" "}
              <Link href={otherHref} className="text-foreground underline underline-offset-4">
                {isSignUp ? "Sign in" : "Create an account"}
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
