import * as React from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignInPage() {
  return (
    <React.Suspense fallback={null}>
      <AuthForm mode="signin" />
    </React.Suspense>
  );
}
