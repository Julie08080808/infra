import { create } from "zustand";
import type {
  ConnectionStatus,
  PlaybackState,
  Track,
  LyricLine,
} from "@/types";

interface PlayerStore {
  // 連線狀態
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;

  // 播放狀態
  playbackState: PlaybackState;
  setPlaybackState: (state: PlaybackState) => void;
  updatePlaybackState: (partial: Partial<PlaybackState>) => void;

  // 歌詞
  lyrics: LyricLine[];
  setLyrics: (lyrics: LyricLine[]) => void;

  // 搜尋結果
  searchResults: Track[];
  setSearchResults: (results: Track[]) => void;
  clearSearchResults: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  // 連線狀態
  connectionStatus: "disconnected",
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  // 播放狀態
  playbackState: {
    isPlaying: false,
    currentTrack: null,
    position: 0,
    duration: 0,
    volume: 50,
    queue: [],
  },
  setPlaybackState: (state) => set({ playbackState: state }),
  updatePlaybackState: (partial) =>
    set((state) => ({
      playbackState: { ...state.playbackState, ...partial },
    })),

  // 歌詞
  lyrics: [],
  setLyrics: (lyrics) => set({ lyrics }),

  // 搜尋結果
  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),
  clearSearchResults: () => set({ searchResults: [] }),
}));
