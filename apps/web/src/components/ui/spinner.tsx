import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 40,
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  const s = sizeMap[size];
  const stroke = size === "sm" ? 2.5 : 2;
  const r = (s / 2) - stroke * 2;
  const circumference = 2 * Math.PI * r;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      className={cn(className)}
      style={{
        animation: "spin-smooth 0.75s linear infinite",
        color: "var(--accent)",
      }}
      aria-label="Loading"
    >
      {/* Track */}
      <circle
        cx={s / 2}
        cy={s / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        opacity={0.15}
      />
      {/* Arc */}
      <circle
        cx={s / 2}
        cy={s / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * 0.75}
        transform={`rotate(-90 ${s / 2} ${s / 2})`}
      />
    </svg>
  );
}
