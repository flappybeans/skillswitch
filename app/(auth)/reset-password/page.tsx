import { Card } from "@/components/ui/card";
import { ResetForm } from "./reset-form";

export default function ResetPasswordPage() {
  return (
    <Card className="space-y-5">
      <h1 className="text-3xl font-semibold">Choose a new password</h1>
      <ResetForm />
    </Card>
  );
}