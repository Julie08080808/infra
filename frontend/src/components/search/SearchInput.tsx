import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export const SearchInput = ({ onSearch, isLoading }: SearchInputProps) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="搜尋歌曲或藝人..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={isLoading}
        className="flex-1"
      />
      <Button type="submit" disabled={isLoading || !query.trim()}>
        {isLoading ? (
          <>
            <Spinner size="sm" />
            <span className="ml-2">搜尋中...</span>
          </>
        ) : (
          "搜尋"
        )}
      </Button>
    </form>
  );
};
