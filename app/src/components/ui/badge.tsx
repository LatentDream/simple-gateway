import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-xl border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "text-foreground",
        warning:
          "text-foreground bg-yellow-50 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
        green:
          "text-foreground bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-200 border-green-200 dark:border-green-800",
        blue:
          "text-foreground bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800",
        red:
          "text-foreground bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 border-red-200 dark:border-red-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
