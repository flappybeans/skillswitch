import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/buttons";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function DesignPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-5xl font-medium">
        Teach one. <span className="text-muted-foreground">Learn one.</span>
      </h1>

      <Card className="space-y-5">
        <div className="flex items-center gap-3">
          <Avatar name="Alex Chen" />
          <div>
            <p className="font-display font-semibold">Alex Chen</p>
            <p className="text-sm text-muted-foreground">Computer Science</p>
          </div>
          <Badge tone="points" className="ml-auto">+25 pts</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge>React</Badge>
          <Badge>Python</Badge>
          <Badge tone="outline">Spanish</Badge>
        </div>

        <Input placeholder="Search a skill..." />

        <div className="flex flex-wrap gap-3">
          <Button>Find a pair</Button>
          <Button variant="outline">Cancel</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="danger">Deactivate</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Card>
    </div>
  );
}
