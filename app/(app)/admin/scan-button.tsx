"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/buttons";
import { runScan } from "./actions";

export function ScanButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  function scan() {
    setMessage(null);
    startTransition(async () => {
      const result = await runScan();
      setFailed(result.error !== null);
      setMessage(
        result.error ??
          (result.added === 0
            ? "Scan finished. Nothing new to review."
            : `Scan finished. ${result.added} new flag${result.added === 1 ? "" : "s"} to review.`)
      );
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button disabled={pending} onClick={scan}>
        {pending ? "Scanning..." : "Run fraud scan"}
      </Button>
      {message && (
        <p
          role="status"
          className={failed ? "text-sm font-medium text-danger" : "text-sm text-muted-foreground"}
        >
          {message}
        </p>
      )}
    </div>
  );
}