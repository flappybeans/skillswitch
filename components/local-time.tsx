"use client";

import { formatStamp, type StampStyle } from "@/lib/format";
import { useIsClient } from "@/lib/use-is-client";

interface LocalTimeProps {
  iso: string;
  style: StampStyle;
  className?: string;
}

export function LocalTime({ iso, style, className }: LocalTimeProps) {
  const isClient = useIsClient();
  return (
    <time dateTime={iso} className={className}>
      {isClient ? formatStamp(iso, style) : "\u00A0"}
    </time>
  );
}