import { Card } from "@/components/ui/card";
import { NowPlaying } from "./NowPlaying";
import { ProgressBar } from "./ProgressBar";
import { PlaybackControls } from "./PlaybackControls";
import { VolumeControl } from "./VolumeControl";

export const PlayerSection = () => {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* 當前播放資訊 */}
        <NowPlaying />

        {/* 播放進度條 */}
        <ProgressBar />

        {/* 播放控制與音量 */}
        <div className="flex items-center justify-between">
          <PlaybackControls />
          <VolumeControl />
        </div>
      </div>
    </Card>
  );
};
