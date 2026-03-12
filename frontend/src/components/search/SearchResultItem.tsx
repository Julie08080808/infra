import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { formatTime } from "@/utils/format";
import type { SearchResult } from "@/types";

interface SearchResultItemProps {
  result: SearchResult;
  onAdd: (videoId: string) => void;
  isAdding?: boolean;
}

export const SearchResultItem = ({
  result,
  onAdd,
  isAdding,
}: SearchResultItemProps) => {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <Avatar
          src={result.thumbnail}
          alt={result.title}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-50 truncate">
            {result.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {result.artist}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {formatTime(result.duration)}
          </p>
        </div>
        <Button
          onClick={() => onAdd(result.videoId)}
          disabled={isAdding}
          size="sm"
        >
          {isAdding ? "加入中..." : "加入佇列"}
        </Button>
      </div>
    </Card>
  );
};
