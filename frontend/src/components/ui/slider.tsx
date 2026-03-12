import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  value: number[];
  max: number;
  step?: number;
  onValueChange: (value: number[]) => void;
  disabled?: boolean;
  className?: string;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ value, max, step = 1, onValueChange, disabled, className }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange([Number(e.target.value)]);
    };

    const currentValue = value[0] || 0;
    const percentage = max > 0 ? (currentValue / max) * 100 : 0;

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className,
        )}
      >
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="absolute h-full bg-gray-900 dark:bg-gray-700 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          disabled={disabled}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className={cn(
            "absolute inset-0 w-full cursor-pointer opacity-0",
            disabled && "cursor-not-allowed",
          )}
        />
        <div
          className={cn(
            "absolute h-4 w-4 rounded-full border-2 border-gray-900 bg-white",
            "transition-all",
            isDragging && "scale-110",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            "dark:border-gray-700 dark:bg-gray-950",
          )}
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    );
  },
);

Slider.displayName = "Slider";

export { Slider };
