import { Avatar } from "@/components/ui/avatar";
import { usePlayerStore } from "@/stores/playerStore";

export const NowPlaying = () => {
  const currentTrack = usePlayerStore(
    (state) => state.playbackState.currentTrack
  );

  if (!currentTrack) {
    return (
      <div className="flex items-center gap-4">
        <Avatar size="lg" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            沒有正在播放的歌曲
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar
        src={currentTrack.thumbnail}
        alt={currentTrack.title}
        size="lg"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-gray-50 truncate">
          {currentTrack.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {currentTrack.artist}
        </p>
      </div>
    </div>
  );
};
