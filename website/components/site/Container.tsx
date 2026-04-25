import { type ReactNode } from "react";

type Width = "narrow" | "default" | "wide";

const maxWidth: Record<Width, string> = {
  narrow: "max-w-[var(--container-narrow)]",
  default: "max-w-[var(--container)]",
  wide: "max-w-[var(--container-wide)]",
};

export function Container({
  children,
  width = "default",
  className = "",
}: {
  children: ReactNode;
  width?: Width;
  className?: string;
}) {
  return (
    <div className={`mx-auto px-6 sm:px-8 ${maxWidth[width]} ${className}`}>
      {children}
    </div>
  );
}
