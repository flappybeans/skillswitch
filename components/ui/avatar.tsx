import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function Avatar({ name, src, size = 40, className }: AvatarProps) {
  const box = { width: size, height: size };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={box}
        className={cn(
          "rounded-full border border-line object-cover",
          className
        )}
      />
    );
  }

  return (
    <div
      style={{ ...box, fontSize: size * 0.4 }}
      className={cn(
        "grid place-items-center rounded-full border border-line bg-muted font-display font-semibold",
        className
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
