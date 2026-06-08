"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string;
    showValue?: boolean;
  }
>(({ className, value, indicatorClassName, showValue, ...props }, ref) => (
  <div className="relative">
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted/50",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        asChild
      >
        <motion.div
          className={cn(
            "h-full bg-gradient-to-r from-primary to-purple-500 transition-all",
            indicatorClassName
          )}
          initial={{ width: 0 }}
          animate={{ width: `${value || 0}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
    {showValue && (
      <span className="absolute right-0 top-[-24px] text-xs text-muted-foreground">
        {Math.round(value || 0)}%
      </span>
    )}
  </div>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };