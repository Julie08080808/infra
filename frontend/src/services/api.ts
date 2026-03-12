import type { ApiResponse, SearchResult } from "@/types";

const API_BASE = "/api";

class ApiService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "未知錯誤",
      };
    }
  }

  // 搜尋音樂
  async search(query: string): Promise<ApiResponse<SearchResult[]>> {
    return this.request<SearchResult[]>(
      `/search?q=${encodeURIComponent(query)}`,
    );
  }

  // 加入到佇列
  async addToQueue(videoId: string): Promise<ApiResponse<void>> {
    return this.request<void>("/queue", {
      method: "POST",
      body: JSON.stringify({ videoId }),
    });
  }

  // 播放
  async play(): Promise<ApiResponse<void>> {
    return this.request<void>("/play", { method: "POST" });
  }

  // 暫停
  async pause(): Promise<ApiResponse<void>> {
    return this.request<void>("/pause", { method: "POST" });
  }

  // 跳過
  async skip(): Promise<ApiResponse<void>> {
    return this.request<void>("/skip", { method: "POST" });
  }

  // 調整音量
  async setVolume(volume: number): Promise<ApiResponse<void>> {
    return this.request<void>("/volume", {
      method: "POST",
      body: JSON.stringify({ volume }),
    });
  }

  // 跳轉播放位置
  async seek(position: number): Promise<ApiResponse<void>> {
    return this.request<void>("/seek", {
      method: "POST",
      body: JSON.stringify({ position }),
    });
  }

  // 從佇列移除
  async removeFromQueue(index: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/queue/${index}`, { method: "DELETE" });
  }

  // 取得當前狀態
  async getState(): Promise<ApiResponse<any>> {
    return this.request<any>("/state");
  }
}

export const api = new ApiService();
