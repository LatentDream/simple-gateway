import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-80 disabled:text-black/50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary hover:bg-yellow-glad text-primary-foreground dark:text-white hover:text-black",
        translucide: "bg-primary/30 text-primary-foreground backdrop-blur-sm hover:bg-primary/60",
        connection: "w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-2 flex items-center justify-center",
        ghost: "hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline underline",
        red:
          "text-foreground bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200 border border-red-600 dark:border-red-800",
        green:
          "text-foreground bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-200 border border-green-600 dark:border-green-800",
        blue:
          "text-foreground bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 border border-blue-600 dark:border-blue-800",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
