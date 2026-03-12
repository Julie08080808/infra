import { useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Empty } from "@/components/ui/empty";
import { usePlayerStore } from "@/stores/playerStore";
import { useLyricSync } from "@/hooks/useLyricSync";
import { cn } from "@/lib/utils";

export const LyricsDisplay = () => {
  const lyrics = usePlayerStore((state) => state.lyrics);
  const { currentIndex } = useLyricSync();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // 自動捲動到當前歌詞行，使用 scrollTop 避免滾動整個頁面
  useEffect(() => {
    if (scrollAreaRef.current && activeRef.current) {
      const scrollArea = scrollAreaRef.current;
      const activeLine = activeRef.current;

      // 計算當前歌詞行相對於 ScrollArea 的位置
      const scrollAreaRect = scrollArea.getBoundingClientRect();
      const activeRect = activeLine.getBoundingClientRect();
      const relativeTop =
        activeRect.top - scrollAreaRect.top + scrollArea.scrollTop;

      // 將當前行滾動到 ScrollArea 的中央
      const targetScroll =
        relativeTop - scrollArea.clientHeight / 2 + activeRect.height / 2;

      scrollArea.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    }
  }, [currentIndex]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">歌詞</CardTitle>
      </CardHeader>
      <CardContent>
        {lyrics.length > 0 ? (
          <ScrollArea ref={scrollAreaRef} maxHeight="400px">
            <div className="space-y-2 py-4">
              {lyrics.map((line, index) => (
                <div
                  key={index}
                  ref={index === currentIndex ? activeRef : null}
                  className={cn(
                    "px-4 py-2 text-center transition-all duration-300",
                    index === currentIndex
                      ? "text-lg font-semibold text-gray-900 dark:text-gray-50 scale-105"
                      : "text-sm text-gray-500 dark:text-gray-400",
                  )}
                >
                  {line.text}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Empty title="沒有歌詞" description="此歌曲沒有可用的歌詞" />
        )}
      </CardContent>
    </Card>
  );
};
