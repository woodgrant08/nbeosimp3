import { cn } from "../../lib/utils"

type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "ghost"

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-gray-200 text-gray-800",
  secondary: "bg-slate-100 text-slate-900",
  outline: "border border-gray-300 bg-transparent text-gray-800",
  destructive: "bg-red-100 text-red-700",
  ghost: "bg-transparent text-gray-800",
}

export function Badge({
  variant = "default",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
}
