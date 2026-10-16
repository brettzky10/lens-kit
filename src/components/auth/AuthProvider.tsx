"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { PlanKey } from "@/lib/actions/plans";

interface AuthContextValue {
  user: User | null;
  credits: number | null;
  /** Credits available this cycle (balance after the last grant + top-ups). Used for the ring. */
  creditsTotal: number | null;
  plan: PlanKey | null;
  loading: boolean;
  refreshCredits: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [credits, setCredits] = React.useState<number | null>(null);
  const [creditsTotal, setCreditsTotal] = React.useState<number | null>(null);
  const [plan, setPlan] = React.useState<PlanKey | null>(null);
  const [loading, setLoading] = React.useState(true);

  const clearCredits = () => {
    setCredits(null);
    setCreditsTotal(null);
    setPlan(null);
  };

  const refreshCredits = React.useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      const json = await res.json();
      if (json.signedIn) {
        setCredits(json.credits);
        setCreditsTotal(json.creditsTotal);
        setPlan(json.plan);
      } else {
        clearCredits();
      }
    } catch {
      // leave values as-is on a transient network error
    }
  }, []);

  React.useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) refreshCredits();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) refreshCredits();
      else clearCredits();
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = React.useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    clearCredits();
  }, []);

  return (
    <AuthContext.Provider value={{ user, credits, creditsTotal, plan, loading, refreshCredits, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}