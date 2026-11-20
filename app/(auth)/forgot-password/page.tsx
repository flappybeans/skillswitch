import { Card } from "@/components/ui/card";
import { ForgotForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>
      <ForgotForm />
    </Card>
  );
}