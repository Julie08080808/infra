import { useEffect, useState } from "react";
import { usePlayerStore } from "@/stores/playerStore";

/**
 * 歌詞同步 Hook
 * 根據播放進度自動更新當前歌詞行
 */
export const useLyricSync = () => {
  const lyrics = usePlayerStore((state) => state.lyrics);
  const position = usePlayerStore((state) => state.playbackState.position);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    if (lyrics.length === 0) {
      setCurrentIndex(-1);
      return;
    }

    // 找到當前應該高亮的歌詞行
    // 從後往前找，找到第一個時間 <= position 的歌詞行
    let newIndex = -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (lyrics[i].time <= position) {
        newIndex = i;
        break;
      }
    }

    setCurrentIndex(newIndex);
  }, [lyrics, position]);

  return { currentIndex };
};
