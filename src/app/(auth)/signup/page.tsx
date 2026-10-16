import * as React from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignUpPage() {
  return (
    <React.Suspense fallback={null}>
      <AuthForm mode="signup" />
    </React.Suspense>
  );
}
