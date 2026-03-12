import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { formatTime } from "@/utils/format";
import type { Track } from "@/types";

interface QueueItemProps {
  track: Track;
  index: number;
  onRemove: (index: number) => void;
  isRemoving?: boolean;
}

export const QueueItem = ({
  track,
  index,
  onRemove,
  isRemoving,
}: QueueItemProps) => {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
          {index + 1}
        </span>
        <Avatar src={track.thumbnail} alt={track.title} size="sm" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
            {track.title}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {track.artist} • {formatTime(track.duration)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          disabled={isRemoving}
          title="移除"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </Button>
      </div>
    </Card>
  );
};
