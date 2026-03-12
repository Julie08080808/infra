import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { QueueList } from "./QueueList";
import { Empty } from "@/components/ui/empty";
import { useToast } from "@/components/ui/toast";
import { usePlayerStore } from "@/stores/playerStore";
import { api } from "@/services/api";

export const QueueSection = () => {
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);
  const queue = usePlayerStore((state) => state.playbackState.queue);
  const { showToast } = useToast();

  const handleRemove = async (index: number) => {
    setRemovingIndex(index);
    try {
      const response = await api.removeFromQueue(index);
      if (response.success) {
        showToast({ message: "已從佇列移除", type: "success" });
      } else {
        showToast({ message: response.error || "移除失敗", type: "error" });
      }
    } catch (error) {
      showToast({ message: "移除發生錯誤", type: "error" });
    } finally {
      setRemovingIndex(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          播放佇列 ({queue.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {queue.length > 0 ? (
          <QueueList
            queue={queue}
            onRemove={handleRemove}
            removingIndex={removingIndex}
          />
        ) : (
          <Empty
            title="播放佇列為空"
            description="搜尋並加入歌曲到佇列"
          />
        )}
      </CardContent>
    </Card>
  );
};
