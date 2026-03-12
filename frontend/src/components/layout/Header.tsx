import { ConnectionStatus } from "./ConnectionStatus";

export const Header = () => {
  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          🎵 YouTube Music Bot
        </h1>
        <ConnectionStatus />
      </div>
    </header>
  );
};
