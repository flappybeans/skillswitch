import { Card } from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <Card className="space-y-5">
      <h1 className="text-3xl font-semibold">Join SkillSwitch</h1>
      <SignupForm />
    </Card>
  );
}
