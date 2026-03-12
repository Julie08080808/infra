import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    return (
      <div ref={ref} role="status" {...props}>
        <div
          className={cn(
            "animate-spin rounded-full border-2 border-gray-200 border-t-blue-600",
            "dark:border-gray-800 dark:border-t-blue-500",
            size === "sm" && "h-4 w-4",
            size === "md" && "h-6 w-6",
            size === "lg" && "h-8 w-8",
            className
          )}
        />
        <span className="sr-only">載入中...</span>
      </div>
    );
  }
);

Spinner.displayName = "Spinner";

export { Spinner };
