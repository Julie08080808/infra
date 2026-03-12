import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/stores/playerStore";
import { api } from "@/services/api";
import { throttle } from "@/utils/format";
import { useMemo } from "react";

export const VolumeControl = () => {
  const volume = usePlayerStore((state) => state.playbackState.volume);

  // 節流音量調整請求
  const handleVolumeChange = useMemo(
    () =>
      throttle((value: number[]) => {
        api.setVolume(value[0]);
      }, 300),
    []
  );

  return (
    <div className="flex items-center gap-2 w-32">
      <svg
        className="h-5 w-5 text-gray-600 dark:text-gray-400"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
      </svg>
      <Slider
        value={[volume]}
        max={100}
        step={1}
        onValueChange={handleVolumeChange}
      />
    </div>
  );
};
