import { usePlayerStore } from "@/stores/playerStore";
import { Badge } from "@/components/ui/badge";

export const ConnectionStatus = () => {
  const connectionStatus = usePlayerStore((state) => state.connectionStatus);

  const statusConfig = {
    connected: {
      variant: "success" as const,
      text: "已連線",
    },
    connecting: {
      variant: "warning" as const,
      text: "連線中...",
    },
    disconnected: {
      variant: "error" as const,
      text: "未連線",
    },
  };

  const config = statusConfig[connectionStatus];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">狀態:</span>
      <Badge variant={config.variant}>{config.text}</Badge>
    </div>
  );
};
