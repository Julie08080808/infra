import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error" | "secondary";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
          variant === "default" &&
            "bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-50",
          variant === "success" &&
            "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
          variant === "warning" &&
            "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
          variant === "error" &&
            "bg-gray-900 text-white dark:bg-gray-700 dark:text-gray-50",
          variant === "secondary" &&
            "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = "Badge";

export { Badge };
