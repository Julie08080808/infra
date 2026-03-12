import { formatTime } from "@/utils/format";

interface TimeDisplayProps {
  current: number;
  total: number;
}

export const TimeDisplay = ({ current, total }: TimeDisplayProps) => {
  return (
    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
      <span>{formatTime(current)}</span>
      <span>{formatTime(total)}</span>
    </div>
  );
};
