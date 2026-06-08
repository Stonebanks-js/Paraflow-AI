import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 overflow-hidden",
  {
    variants: {
      variant: {
        default: [
          "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground",
          "hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02]",
          "active:scale-[0.98]",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/80 hover:shadow-md",
          "active:scale-[0.98]",
        ].join(" "),
        ghost: [
          "hover:bg-accent hover:text-accent-foreground",
          "active:scale-[0.98]",
        ].join(" "),
        outline: [
          "border border-border bg-transparent",
          "hover:bg-accent hover:border-primary/50 hover:text-primary",
          "active:scale-[0.98]",
        ].join(" "),
        destructive: [
          "bg-destructive/90 text-destructive-foreground",
          "hover:bg-destructive hover:shadow-lg hover:shadow-destructive/25",
          "active:scale-[0.98]",
        ].join(" "),
        success: [
          "bg-success/90 text-white",
          "hover:bg-success hover:shadow-lg hover:shadow-success/25",
          "active:scale-[0.98]",
        ].join(" "),
        warning: [
          "bg-warning/90 text-black",
          "hover:bg-warning hover:shadow-lg hover:shadow-warning/25",
          "active:scale-[0.98]",
        ].join(" "),
        link: "text-primary underline-offset-4 hover:underline",
        gradient: [
          "bg-gradient-to-r from-primary via-purple-500 to-pink-500 text-white",
          "hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]",
          "active:scale-[0.98]",
        ].join(" "),
        glass: [
          "glass bg-card/50",
          "hover:bg-card/70 hover:border-primary/30",
          "backdrop-blur-xl",
        ].join(" "),
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-13 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-13 w-13",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "children">,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        whileHover={{ scale: disabled || isLoading ? 1 : undefined }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        {...props}
      >
        {isLoading && (
          <svg
            className="absolute h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        <span className={cn("inline-flex items-center gap-2", isLoading && "invisible")}>
          {leftIcon && <span className="inline-flex">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex">{rightIcon}</span>}
        </span>
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };