import { icons } from "lucide-react";

/**
 * Server-safe icon renderer. Returns null when the name isn't in
 * lucide-react's icon map (e.g. an icon removed from the catalog after
 * a card was saved). Caller decides what to fall back to.
 */
export function IconRender({
  name,
  size = 24,
  strokeWidth = 2,
  className,
}: {
  name: string | null | undefined;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  if (!name) return null;
  const Cmp = (icons as Record<string, React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
    "aria-hidden"?: boolean;
  }>>)[name];
  if (!Cmp) return null;
  return (
    <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden />
  );
}
