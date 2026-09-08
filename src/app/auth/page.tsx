import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-lg font-semibold text-foreground">Sign in — coming soon</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Cloud autosave and account sync aren&apos;t wired up yet. For now, use
        &quot;Save flow&quot; to export your work as a JSON file you can import again later.
      </p>
      <Button asChild variant="secondary">
        <Link href="/flow">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to the editor
        </Link>
      </Button>
    </main>
  );
}
