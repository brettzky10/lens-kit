"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { UserMenu } from "@/components/auth/user-menu";

/** Drop this in your header: shows Sign in, or the avatar + credit ring menu. */
export function AccountMenu() {
  const { user, credits, creditsTotal, signOut, loading } = useAuth();
  const router = useRouter();

  if (loading) return null;
  if (!user) {
    return (
      <Button size="sm">
        <Link href="/signin">Sign in</Link>
      </Button>
    );
  }

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;

  return (
    <UserMenu
      user={{
        name: meta.full_name ?? meta.name ?? user.email ?? "User",
        image: meta.avatar_url ?? null,
      }}
      totalCredits={creditsTotal ?? 0}
      remainingCredits={credits ?? 0}
      onUpgrade={() => router.push("/billing")}
      onSignOut={async () => {
        await signOut();
        router.replace("/signin");
        router.refresh();
      }}
    />
  );
}
