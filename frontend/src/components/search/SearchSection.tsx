import { useState } from "react";
import { SearchInput } from "./SearchInput";
import { SearchResultItem } from "./SearchResultItem";
import { Empty } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { usePlayerStore } from "@/stores/playerStore";
import { api } from "@/services/api";

export const SearchSection = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const searchResults = usePlayerStore((state) => state.searchResults);
  const setSearchResults = usePlayerStore((state) => state.setSearchResults);
  const { showToast } = useToast();

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const response = await api.search(query);
      if (response.success && response.data) {
        setSearchResults(response.data);
        if (response.data.length === 0) {
          showToast({ message: "沒有找到相關歌曲", type: "info" });
        }
      } else {
        showToast({ message: response.error || "搜尋失敗", type: "error" });
      }
    } catch (error) {
      showToast({ message: "搜尋發生錯誤", type: "error" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToQueue = async (videoId: string) => {
    setAddingId(videoId);
    try {
      const response = await api.addToQueue(videoId);
      if (response.success) {
        showToast({ message: "已加入播放佇列", type: "success" });
      } else {
        showToast({ message: response.error || "加入失敗", type: "error" });
      }
    } catch (error) {
      showToast({ message: "加入發生錯誤", type: "error" });
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          搜尋音樂
        </h2>
      </div>

      <SearchInput onSearch={handleSearch} isLoading={isSearching} />

      {isSearching ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-2">
          {searchResults.map((result) => (
            <SearchResultItem
              key={result.videoId}
              result={result}
              onAdd={handleAddToQueue}
              isAdding={addingId === result.videoId}
            />
          ))}
        </div>
      ) : (
        <Empty
          title="尚無搜尋結果"
          description="輸入關鍵字開始搜尋音樂"
        />
      )}
    </div>
  );
};
