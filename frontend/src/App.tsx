import { useWebSocket } from "@/hooks/useWebSocket";
import { MainLayout } from "@/components/layout/MainLayout";
import { SearchSection } from "@/components/search/SearchSection";
import { PlayerSection } from "@/components/player/PlayerSection";
import { QueueSection } from "@/components/queue/QueueSection";
import { LyricsDisplay } from "@/components/lyrics/LyricsDisplay";
import { ToastProvider } from "@/components/ui/toast";

function App() {
  // 初始化 WebSocket 連接
  useWebSocket();

  return (
    <ToastProvider>
      <MainLayout>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：搜尋和播放器 */}
          <div className="space-y-6">
            <SearchSection />
            <PlayerSection />
          </div>

          {/* 右側：播放佇列和歌詞 */}
          <div className="space-y-6">
            <QueueSection />
            <LyricsDisplay />
          </div>
        </div>
      </MainLayout>
    </ToastProvider>
  );
}

export default App;
