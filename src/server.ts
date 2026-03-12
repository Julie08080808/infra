import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import api from "./routes/api.ts";
import {
  handleWebSocketMessage,
  handleWebSocketOpen,
  handleWebSocketClose,
  initializeWebSocket,
} from "./websocket/handler.ts";

const app = new Hono();

// 提供靜態檔案
// 生產環境使用 frontend/dist，開發環境使用 public
const staticRoot =
  process.env.NODE_ENV === "production" ? "./frontend/dist" : "./public";
app.use("/*", serveStatic({ root: staticRoot }));

// API 路由
app.route("/api", api);

// WebSocket 路由（Bun 原生支援）
export function createServer() {
  // 初始化 WebSocket 廣播
  initializeWebSocket();

  return Bun.serve({
    port: 3000,
    fetch(req, server) {
      // WebSocket 升級
      const url = new URL(req.url);
      if (url.pathname === "/ws") {
        const success = server.upgrade(req);
        return success
          ? undefined
          : new Response("WebSocket upgrade failed", { status: 500 });
      }

      // 一般 HTTP 請求
      return app.fetch(req, server);
    },
    websocket: {
      open(ws) {
        handleWebSocketOpen(ws);
      },
      message(ws, message) {
        handleWebSocketMessage(ws, message.toString());
      },
      close(ws) {
        handleWebSocketClose(ws);
      },
    },
  });
}
