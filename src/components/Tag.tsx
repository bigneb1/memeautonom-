import type { ReactNode } from "react";

const colorMap: Record<string, string> = {
  yellow: "text-yellow border-yellow/50",
  cyan: "text-cyan border-cyan/50",
  green: "text-green border-green/50",
  orange: "text-orange border-orange/50",
  red: "text-red border-red/50",
  purple: "text-purple border-purple/50",
  muted: "text-muted-foreground border-border",
};

export function Tag({
  children,
  color = "muted",
  dot,
}: {
  children: ReactNode;
  color?: keyof typeof colorMap;
  dot?: boolean;
}) {
  return (
    <span className={`tag ${colorMap[color]}`}>
      {dot && <span className={`w-1 h-1 rounded-full bg-current live-dot`} />}
      {children}
    </span>
  );
}
