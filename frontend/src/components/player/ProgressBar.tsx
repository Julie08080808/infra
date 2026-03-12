import { Slider } from "@/components/ui/slider";
import { TimeDisplay } from "./TimeDisplay";
import { usePlayerStore } from "@/stores/playerStore";
import { api } from "@/services/api";
import { throttle } from "@/utils/format";
import { useMemo } from "react";

export const ProgressBar = () => {
  // 分別選擇以避免創建新對象
  const position = usePlayerStore((state) => state.playbackState.position);
  const duration = usePlayerStore((state) => state.playbackState.duration);

  // 節流 seek 請求，避免過於頻繁
  const handleSeek = useMemo(
    () =>
      throttle((value: number[]) => {
        const newPosition = value[0];
        api.seek(newPosition);
      }, 500),
    [],
  );

  return (
    <div className="space-y-2">
      <Slider
        value={[position]}
        max={duration || 100}
        step={1}
        onValueChange={handleSeek}
        disabled={!duration}
      />
      <TimeDisplay current={position} total={duration} />
    </div>
  );
};
