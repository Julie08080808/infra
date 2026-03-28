import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Compass,
  Disc3,
  Globe2,
  Heart,
  Layers3,
  ListMusic,
  Loader2,
  Music2,
  PlayCircle,
  Radio,
  RefreshCw,
} from "lucide-react";
import { OpenAlbumButton } from "@/components/album/OpenAlbumButton";
import { OpenArtistButton } from "@/components/artist/OpenArtistButton";
import { MusicVideoHeroRail } from "@/components/discover/MusicVideoHeroRail";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import { useAlbumDialogStore } from "@/stores/albumDialogStore";
import { useArtistDialogStore } from "@/stores/artistDialogStore";
import { useDiscoverStore } from "@/stores/discoverStore";
import { getCurrentRequester, useLibraryStore } from "@/stores/libraryStore";
import { usePlaylistDialogStore } from "@/stores/playlistDialogStore";
import type {
  DiscoverCollectionItem,
  DiscoverItem,
  DiscoverTrackItem,
  TopRequestedEntry,
  Track,
} from "@/types";
import { formatTime } from "@/utils/format";
import {
  ThumbnailQuality,
  type ThumbnailQuality as ThumbnailQualityType,
  getOptimizedThumbnailCandidates,
} from "@/utils/thumbnail";

interface DiscoverViewProps {
  isMobile?: boolean;
}

interface DiscoverTrackRankingMeta {
  rank: number;
  requestCount: number;
  lastRequestedAt: string;
}

interface DiscoverCollectionPreview {
  tracks: Track[];
  trackCount?: number;
}

interface DiscoverCollectionPreviewState {
  status: "idle" | "loading" | "ready" | "error";
  preview: DiscoverCollectionPreview | null;
  error: string | null;
}

interface DiscoverCardDestination {
  label: string | null;
  onOpen: (() => void) | null;
}

const MUSIC_VIDEO_SECTION_PATTERNS = [
  /latest\s+music\s+videos?/iu,
  /music\s+videos?/iu,
  /video\s+highlights?/iu,
  /音樂影片/iu,
  /音樂錄影帶/iu,
  /音樂視頻/iu,
  /ミュージック.?ビデオ/iu,
  /뮤직.?비디오/iu,
  /vídeos?\s+musicais?/iu,
  /videoclipes?/iu,
];

const DISCOVER_CHIP_BUTTON_CLASS =
  "rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]";
const DISCOVER_CHIP_LABEL_CLASS = "text-[11px]";
const DISCOVER_PANEL_CLASS =
  "rounded-[22px] border border-[color:var(--surface-border)] bg-[color:color-mix(in_srgb,var(--surface-subtle)_84%,var(--accent-soft)_16%)] p-3";
const DISCOVER_PREVIEW_LIMIT = 3;
const DISCOVER_RAIL_FOCUS_MIN = 48;
const DISCOVER_RAIL_FOCUS_MAX = 96;
const DISCOVER_RAIL_FOCUS_RATIO = 0.12;
const DISCOVER_RAIL_FEATURED_THRESHOLD = 0.58;

const collectionPreviewCache = new Map<string, DiscoverCollectionPreview>();
const collectionPreviewInFlight = new Map<
  string,
  Promise<DiscoverCollectionPreview | null>
>();

function formatFetchedAt(value: string | null): string {
  if (!value) {
    return "尚未更新";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "尚未更新";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatLastRequestedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "剛剛更新";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeCompareText(value: string): string {
  return value
    .replace(/[•·]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isDiscoverTrackItem(item: DiscoverItem): item is DiscoverTrackItem {
  return item.kind === "track";
}

function isMusicVideoSection(section: {
  title: string;
  subtitle?: string;
  items: DiscoverItem[];
}): boolean {
  const trackItems = section.items.filter(isDiscoverTrackItem);

  if (trackItems.length === 0 || trackItems.length !== section.items.length) {
    return false;
  }

  const explicitVideoCount = trackItems.filter(
    (item) => item.presentation === "video",
  ).length;
  const sectionLabel = `${section.title} ${section.subtitle || ""}`;

  return (
    explicitVideoCount >= Math.max(1, Math.ceil(trackItems.length / 2)) ||
    MUSIC_VIDEO_SECTION_PATTERNS.some((pattern) => pattern.test(sectionLabel))
  );
}

function getCollectionSupportText(item: DiscoverCollectionItem): string {
  const subtitle = item.subtitle?.trim();
  const artist = item.artist?.trim();

  if (subtitle) {
    const normalizedSubtitle = normalizeCompareText(
      subtitle
        .replace(/^專輯\s*[•·]\s*/u, "")
        .replace(/^播放清單\s*[•·]\s*/u, ""),
    );
    const normalizedArtist = artist ? normalizeCompareText(artist) : "";

    if (normalizedSubtitle && normalizedSubtitle !== normalizedArtist) {
      return subtitle;
    }
  }

  return item.kind === "album"
    ? "打開專輯後可查看完整曲目與逐首操作。"
    : "打開播放清單後可單獨挑選歌曲加入佇列。";
}

function getTrackDuration(item: DiscoverTrackItem): number {
  return item.duration > 0 ? item.duration : item.track.duration;
}

function resolveCollectionPreviewKey(item: DiscoverCollectionItem): string {
  return `${item.kind}:${item.id}`;
}

function resolveCollectionTrackCount(
  item: DiscoverCollectionItem,
  responseCount: number,
): number | undefined {
  const responseTrackCount = responseCount > 0 ? responseCount : undefined;

  if (
    typeof item.trackCount === "number" &&
    item.trackCount > 0 &&
    responseTrackCount
  ) {
    return Math.max(item.trackCount, responseTrackCount);
  }

  if (typeof item.trackCount === "number" && item.trackCount > 0) {
    return item.trackCount;
  }

  return responseTrackCount;
}

async function loadCollectionPreview(
  item: DiscoverCollectionItem,
): Promise<DiscoverCollectionPreview | null> {
  const cacheKey = resolveCollectionPreviewKey(item);
  const cachedPreview = collectionPreviewCache.get(cacheKey);

  if (cachedPreview) {
    return cachedPreview;
  }

  const pendingPreview = collectionPreviewInFlight.get(cacheKey);
  if (pendingPreview) {
    return pendingPreview;
  }

  const previewPromise = (async () => {
    const response =
      item.kind === "album"
        ? await api.getAlbum(item.id)
        : await api.getPlaylist(item.id);

    if (!response.success || !response.data) {
      return null;
    }

    const preview: DiscoverCollectionPreview = {
      tracks: response.data.tracks.slice(0, DISCOVER_PREVIEW_LIMIT),
      trackCount: resolveCollectionTrackCount(
        item,
        response.data.tracks.length,
      ),
    };

    collectionPreviewCache.set(cacheKey, preview);
    return preview;
  })().finally(() => {
    collectionPreviewInFlight.delete(cacheKey);
  });

  collectionPreviewInFlight.set(cacheKey, previewPromise);

  return previewPromise;
}

function useDiscoverCollectionPreview(item: DiscoverCollectionItem) {
  const cacheKey = useMemo(
    () => resolveCollectionPreviewKey(item),
    [item.id, item.kind],
  );
  const [state, setState] = useState<DiscoverCollectionPreviewState>(() => {
    const cachedPreview = collectionPreviewCache.get(cacheKey);

    return cachedPreview
      ? {
          status: "ready",
          preview: cachedPreview,
          error: null,
        }
      : {
          status: "idle",
          preview: null,
          error: null,
        };
  });

  useEffect(() => {
    const cachedPreview = collectionPreviewCache.get(cacheKey);

    if (cachedPreview) {
      setState({
        status: "ready",
        preview: cachedPreview,
        error: null,
      });
      return;
    }

    let cancelled = false;

    setState((currentState) =>
      currentState.status === "loading"
        ? currentState
        : {
            status: "loading",
            preview: currentState.preview,
            error: null,
          },
    );

    void loadCollectionPreview(item)
      .then((preview) => {
        if (cancelled) {
          return;
        }

        if (preview) {
          setState({
            status: "ready",
            preview,
            error: null,
          });
          return;
        }

        setState({
          status: "error",
          preview: null,
          error: "collection-preview-load-failed",
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: "error",
            preview: null,
            error: "collection-preview-load-failed",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, item.id, item.kind]);

  return state;
}

function SectionHeading({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-subtle)] text-[var(--accent)]">
            {icon}
          </span>
          <span>{title}</span>
        </div>
        {subtitle ? (
          <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function InfoPill({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "inverse";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
        tone === "default" &&
          "border-[color:var(--surface-border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]",
        tone === "accent" &&
          "border-[color:var(--dynamic-ring)] bg-[var(--accent-soft)] text-[var(--accent)]",
        tone === "inverse" &&
          "border-white/14 bg-black/25 text-white/90 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

function DiscoverHorizontalRail({
  children,
  className,
  viewportClassName,
  contentClassName,
  viewportRef,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  viewportRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className={cn("-mx-3 overflow-visible px-3 pt-5 pb-10", className)}>
      <div
        ref={viewportRef}
        className={cn(
          "snap-x snap-proximity overflow-x-auto overflow-y-hidden pt-2 pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          viewportClassName,
        )}
      >
        <div
          className={cn(
            "flex min-w-full items-stretch gap-4 px-3",
            contentClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function DiscoverArtwork({
  src,
  alt,
  preferredQuality = ThumbnailQuality.HIGH,
  className,
}: {
  src?: string;
  alt: string;
  preferredQuality?: ThumbnailQualityType;
  className?: string;
}) {
  const [failedCandidates, setFailedCandidates] = useState<string[]>([]);
  const candidateSources = useMemo(
    () => (src ? getOptimizedThumbnailCandidates(src, preferredQuality) : []),
    [preferredQuality, src],
  );
  const optimizedSrc = useMemo(
    () =>
      candidateSources.find((candidate) => !failedCandidates.includes(candidate)),
    [candidateSources, failedCandidates, src],
  );

  useEffect(() => {
    setFailedCandidates([]);
  }, [candidateSources, src]);

  if (optimizedSrc) {
    return (
      <img
        src={optimizedSrc}
        alt={alt}
        className={cn("discover-artwork-media h-full w-full object-cover", className)}
        decoding="async"
        loading="lazy"
        draggable={false}
        onError={() => {
          if (
            candidateSources.length > 0 &&
            !failedCandidates.includes(optimizedSrc)
          ) {
            setFailedCandidates((previousCandidates) => [
              ...previousCandidates,
              optimizedSrc,
            ]);
          }
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "h-full w-full bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.2),_transparent_38%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(31,63,146,0.82)_46%,_rgba(161,98,7,0.72)_100%)]",
        className,
      )}
    />
  );
}

function MarketChip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "border-transparent bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[0_16px_32px_-24px_var(--accent-glow)]"
          : "border-[color:var(--surface-border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
      }`}
    >
      {label}
    </button>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {warnings.map((warning) => (
        <div
          key={warning}
          className="flex items-start gap-3 rounded-[22px] border border-[color:var(--surface-border)] bg-[color:var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}

function getTrackDestination(
  item: DiscoverTrackItem,
  openAlbum: (album: Track["album"]) => void,
  openArtist: (artist: { id: string; name: string }) => void,
): DiscoverCardDestination {
  const album = item.track.album;
  const artistId = item.artistId || item.track.artistId;

  if (album?.id && album.name) {
    return {
      label: "展開專輯",
      onOpen: () => openAlbum(album),
    };
  }

  if (artistId?.trim() && item.artist.trim()) {
    return {
      label: "探索歌手",
      onOpen: () =>
        openArtist({
          id: artistId,
          name: item.artist,
        }),
    };
  }

  return {
    label: null,
    onOpen: null,
  };
}

function useDiscoverRailFeaturedIndex(
  enabled: boolean,
  itemCount: number,
  railKey: string,
) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, itemCount);
  }, [itemCount]);

  const setItemEmphasis = (node: HTMLDivElement | null, emphasis: number) => {
    if (!node) {
      return;
    }

    const normalizedEmphasis = Math.max(0, Math.min(emphasis, 1));
    const nextValue = normalizedEmphasis.toFixed(4);

    if (node.style.getPropertyValue("--discover-rail-emphasis") !== nextValue) {
      node.style.setProperty("--discover-rail-emphasis", nextValue);
    }

    const nextFeaturedValue =
      normalizedEmphasis >= DISCOVER_RAIL_FEATURED_THRESHOLD ? "true" : "false";

    if (node.dataset.featured !== nextFeaturedValue) {
      node.dataset.featured = nextFeaturedValue;
    }
  };

  useLayoutEffect(() => {
    if (!enabled) {
      itemRefs.current.slice(0, itemCount).forEach((node) => {
        setItemEmphasis(node, 0);
      });
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    let frameId = 0;
    const previousValues = Array.from({ length: itemCount }, () => -1);

    const resolveEmphasisValues = () => {
      const viewportRect = viewport.getBoundingClientRect();
      const anchorX =
        viewportRect.left +
        Math.min(
          DISCOVER_RAIL_FOCUS_MAX,
          Math.max(
            DISCOVER_RAIL_FOCUS_MIN,
            viewport.clientWidth * DISCOVER_RAIL_FOCUS_RATIO,
          ),
        );
      const influenceRange = Math.max(viewport.clientWidth * 0.82, 360);

      return itemRefs.current.slice(0, itemCount).map((node) => {
        if (!node) {
          return 0;
        }

        const rect = node.getBoundingClientRect();
        const distance = Math.abs(rect.left - anchorX);
        const normalized = Math.max(0, 1 - distance / influenceRange);

        return Number(
          (normalized * normalized * (3 - 2 * normalized)).toFixed(4),
        );
      });
    };

    const applyMeasure = () => {
      const nextValues = resolveEmphasisValues();

      nextValues.forEach((value, index) => {
        if (Math.abs(previousValues[index] - value) < 0.01) {
          return;
        }

        previousValues[index] = value;
        setItemEmphasis(itemRefs.current[index], value);
      });
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(applyMeasure);
    };

    applyMeasure();
    viewport.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      window.cancelAnimationFrame(frameId);
      viewport.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [enabled, itemCount, railKey]);

  const setItemRef = (index: number) => (node: HTMLDivElement | null) => {
    itemRefs.current[index] = node;
  };

  return {
    viewportRef,
    setItemRef,
  };
}

function TrackSupportPanel({ item }: { item: DiscoverTrackItem }) {
  const hasAlbum = Boolean(item.track.album?.id && item.track.album?.name);
  const hasArtist = Boolean((item.artistId || item.track.artistId)?.trim());

  return (
    <div className={cn(DISCOVER_PANEL_CLASS, "min-h-[4.75rem]")}>
      {hasAlbum || hasArtist ? (
        <div className="flex flex-wrap gap-2">
          {item.track.album ? (
            <OpenAlbumButton
              album={item.track.album}
              trackTitle={item.track.title}
              className={DISCOVER_CHIP_BUTTON_CLASS}
              labelClassName={DISCOVER_CHIP_LABEL_CLASS}
            />
          ) : null}
          <OpenArtistButton
            artistId={item.artistId || item.track.artistId}
            artistName={item.artist}
            className={DISCOVER_CHIP_BUTTON_CLASS}
            labelClassName={DISCOVER_CHIP_LABEL_CLASS}
          />
        </div>
      ) : (
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          可直接加入佇列或建立 Mix，之後再從專輯與歌手頁深入探索更多作品。
        </p>
      )}
    </div>
  );
}

function TopRequestedStatsStrip({
  meta,
}: {
  meta: DiscoverTrackRankingMeta;
}) {
  return (
    <div
      className={cn(
        DISCOVER_PANEL_CLASS,
        "grid min-h-[4.75rem] grid-cols-2 gap-3",
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          點播次數
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
          已點播 {meta.requestCount} 次
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          最後更新
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
          {formatLastRequestedAt(meta.lastRequestedAt)}
        </p>
      </div>
    </div>
  );
}

function CollectionPreviewSkeleton() {
  return (
    <div className={cn(DISCOVER_PANEL_CLASS, "min-h-[13rem]")}>
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
        載入曲目預覽
      </div>
      <div className="space-y-2">
        {Array.from({ length: DISCOVER_PREVIEW_LIMIT }, (_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-[18px] border border-[color:var(--surface-border)] bg-[var(--surface-elevated)]/70 px-3 py-3"
          >
            <div className="h-3.5 w-2/3 rounded-full bg-[var(--surface-border)]" />
            <div className="mt-2 h-3 w-1/3 rounded-full bg-[var(--surface-border)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CollectionPreviewRow({
  track,
  index,
}: {
  track: Track;
  index: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-[color:var(--surface-border)] bg-[var(--surface-elevated)]/70 px-3 py-2.5">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-subtle)] text-[11px] font-semibold text-[var(--text-muted)]">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
          {track.title}
        </p>
        <p className="truncate text-xs text-[var(--text-secondary)]">
          {track.artist}
        </p>
      </div>
      <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">
        {formatTime(track.duration)}
      </span>
    </div>
  );
}

function CollectionPreviewPanel({
  item,
  state,
}: {
  item: DiscoverCollectionItem;
  state: DiscoverCollectionPreviewState;
}) {
  const previewTracks = state.preview?.tracks ?? [];
  const totalCount = state.preview?.trackCount ?? item.trackCount;

  if (state.status === "loading" && previewTracks.length === 0) {
    return <CollectionPreviewSkeleton />;
  }

  if (previewTracks.length > 0) {
    return (
      <div className={cn(DISCOVER_PANEL_CLASS, "min-h-[13rem]")}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            曲目預覽
          </p>
          {typeof totalCount === "number" && totalCount > previewTracks.length ? (
            <span className="text-xs text-[var(--text-muted)]">
              還有 {totalCount - previewTracks.length} 首
            </span>
          ) : null}
        </div>
        <div className="space-y-2">
          {previewTracks.map((track, index) => (
            <CollectionPreviewRow
              key={`${track.videoId}-${index}`}
              track={track}
              index={index}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(DISCOVER_PANEL_CLASS, "min-h-[13rem]")}>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">
        {state.error ? "目前暫時無法預先載入曲目，" : ""}
        {getCollectionSupportText(item)}
      </p>
    </div>
  );
}

function TrackDiscoverCard({
  item,
  onQueueTrack,
  onCreateMix,
  onToggleFavorite,
  isPending,
  isCreatingMix,
  isFavorite,
  favoriteDisabled,
  rankingMeta,
}: {
  item: DiscoverTrackItem;
  onQueueTrack: (track: Track) => Promise<void>;
  onCreateMix: (track: Track) => Promise<void>;
  onToggleFavorite: (track: Track) => Promise<void>;
  isPending: boolean;
  isCreatingMix: boolean;
  isFavorite: boolean;
  favoriteDisabled: boolean;
  rankingMeta?: DiscoverTrackRankingMeta;
}) {
  const openAlbum = useAlbumDialogStore((state) => state.openAlbum);
  const openArtist = useArtistDialogStore((state) => state.openArtist);
  const destination = getTrackDestination(item, openAlbum, openArtist);
  const duration = getTrackDuration(item);

  return (
    <Card
      className={cn(
        "discover-rail-card flex w-[min(88vw,23rem)] shrink-0 flex-col overflow-hidden rounded-[30px] border p-0",
      )}
    >
      <button
        type="button"
        onClick={() => destination.onOpen?.()}
        disabled={!destination.onOpen}
        className={cn(
          "group block text-left",
          destination.onOpen ? "cursor-pointer" : "cursor-default",
        )}
      >
        <div
          className={cn(
            "discover-rail-card-media relative h-[16.75rem] overflow-hidden sm:h-[17.25rem]",
          )}
        >
          <DiscoverArtwork
            src={item.thumbnail || item.track.thumbnail}
            alt={item.title}
            preferredQuality={ThumbnailQuality.MAXRES}
            className={cn(
              "transition-transform duration-500",
              destination.onOpen && "group-hover:scale-[1.04]",
            )}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(9,14,24,0.08)_0%,_rgba(9,14,24,0.18)_34%,_rgba(9,14,24,0.84)_100%)]" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
            <div className="flex flex-wrap items-start gap-2">
              {rankingMeta ? (
                <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-[18px] border border-white/16 bg-white/12 px-3 text-sm font-semibold text-white shadow-[0_18px_36px_-24px_rgba(0,0,0,0.6)] backdrop-blur-sm">
                  #{rankingMeta.rank}
                </span>
              ) : null}
              <InfoPill tone="inverse">
                {item.presentation === "video" ? "影片" : "單曲"}
              </InfoPill>
            </div>
            <InfoPill tone="inverse">{formatTime(duration)}</InfoPill>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4">
            {destination.label ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/92 backdrop-blur-sm">
                {destination.label}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </div>
        </div>
      </button>

      <div className="flex min-h-0 flex-1 flex-col p-4 lg:p-5">
        <div className="min-h-[5.75rem] space-y-1.5">
          <h3
            className="line-clamp-2 text-[1.2rem] font-semibold leading-8 tracking-tight text-[var(--text-primary)]"
          >
            {item.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
            {item.artist}
          </p>
        </div>

        <div className="mt-4">
          {rankingMeta ? (
            <TopRequestedStatsStrip meta={rankingMeta} />
          ) : (
            <TrackSupportPanel item={item} />
          )}
        </div>

        <div className="mt-auto border-t border-[color:var(--surface-border)]/75 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={() => {
                void onQueueTrack(item.track);
              }}
              disabled={isPending || isCreatingMix}
              className="h-11 rounded-[18px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  加入中
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  加入佇列
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void onCreateMix(item.track);
              }}
              disabled={isPending || isCreatingMix}
              className="h-11 rounded-[18px]"
            >
              {isCreatingMix ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  建立中
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4" />
                  建立 Mix
                </>
              )}
            </Button>
            <Button
              type="button"
              variant={isFavorite ? "default" : "outline"}
              onClick={() => {
                void onToggleFavorite(item.track);
              }}
              disabled={favoriteDisabled}
              className="col-span-2 h-11 rounded-[18px]"
            >
              <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
              {isFavorite ? "已收藏" : "加入收藏"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CollectionDiscoverCard({
  item,
  onQueueCollection,
  isPending,
}: {
  item: DiscoverCollectionItem;
  onQueueCollection: (item: DiscoverCollectionItem) => Promise<void>;
  isPending: boolean;
}) {
  const openAlbum = useAlbumDialogStore((state) => state.openAlbum);
  const openPlaylist = usePlaylistDialogStore((state) => state.openPlaylist);
  const previewState = useDiscoverCollectionPreview(item);
  const destinationLabel =
    item.kind === "album" ? "展開專輯" : "展開播放清單";
  const displayTrackCount = previewState.preview?.trackCount ?? item.trackCount;

  const openCollection = () => {
    if (item.kind === "album") {
      openAlbum({
        id: item.id,
        name: item.title,
      });
      return;
    }

    openPlaylist({
      id: item.id,
      name: item.title,
    });
  };

  return (
    <Card
      className={cn(
        "discover-rail-card flex w-[min(90vw,24rem)] shrink-0 flex-col overflow-hidden rounded-[30px] border p-0",
      )}
    >
      <button
        type="button"
        onClick={openCollection}
        className="group block text-left"
      >
        <div
          className={cn(
            "discover-rail-card-media relative h-[17.5rem] overflow-hidden sm:h-[18rem]",
          )}
        >
          <DiscoverArtwork
            src={item.thumbnail}
            alt={item.title}
            preferredQuality={ThumbnailQuality.MAXRES}
            className="transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(9,14,24,0.08)_0%,_rgba(9,14,24,0.18)_38%,_rgba(9,14,24,0.84)_100%)]" />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
            <div className="flex flex-wrap gap-2">
              <InfoPill tone="inverse">
                {item.kind === "album" ? "專輯" : "播放清單"}
              </InfoPill>
              {displayTrackCount ? (
                <InfoPill tone="inverse">{displayTrackCount} 首</InfoPill>
              ) : null}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/92 backdrop-blur-sm">
              {destinationLabel}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </button>

      <div className="flex min-h-0 flex-1 flex-col p-4 lg:p-5">
        <div className="min-h-[5.75rem] space-y-1.5">
          <h3
            className="line-clamp-2 text-[1.2rem] font-semibold leading-8 tracking-tight text-[var(--text-primary)]"
          >
            {item.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
            {item.artist}
          </p>
        </div>

        <div className="mt-4 flex min-h-[2.75rem] flex-wrap content-start items-center gap-2">
          <InfoPill tone="accent" className="gap-1.5">
            {item.kind === "album" ? (
              <Disc3 className="h-3.5 w-3.5" />
            ) : (
              <ListMusic className="h-3.5 w-3.5" />
            )}
            {item.kind === "album" ? "新作品" : "主題精選"}
          </InfoPill>
          <OpenArtistButton
            artistId={item.artistId}
            artistName={item.artist}
            className={DISCOVER_CHIP_BUTTON_CLASS}
            labelClassName={DISCOVER_CHIP_LABEL_CLASS}
          />
        </div>

        <div className="mt-4">
          <CollectionPreviewPanel item={item} state={previewState} />
        </div>

        <div className="mt-auto border-t border-[color:var(--surface-border)]/75 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={openCollection}
              className="h-11 rounded-[18px] px-3 text-[13px]"
            >
              <ArrowUpRight className="h-4 w-4" />
              {destinationLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void onQueueCollection(item);
              }}
              disabled={isPending}
              className="h-11 rounded-[18px] px-3 text-[13px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  加入中
                </>
              ) : (
                <>
                  <ListMusic className="h-4 w-4" />
                  整組加入佇列
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DiscoverSectionRail({
  section,
  onQueueTrack,
  onCreateMix,
  onToggleFavorite,
  onQueueCollection,
  pendingTrackId,
  creatingMixId,
  pendingCollectionId,
  favoriteTrackIds,
  libraryReady,
}: {
  section: {
    id: string;
    title: string;
    subtitle?: string;
    items: DiscoverItem[];
  };
  onQueueTrack: (track: Track) => Promise<void>;
  onCreateMix: (track: Track) => Promise<void>;
  onToggleFavorite: (track: Track) => Promise<void>;
  onQueueCollection: (item: DiscoverCollectionItem) => Promise<void>;
  pendingTrackId: string | null;
  creatingMixId: string | null;
  pendingCollectionId: string | null;
  favoriteTrackIds: ReadonlySet<string>;
  libraryReady: boolean;
}) {
  if (section.items.length === 0) {
    return null;
  }

  if (isMusicVideoSection(section)) {
    return (
      <MusicVideoHeroRail
        title={section.title}
        subtitle={section.subtitle}
        items={section.items.filter(isDiscoverTrackItem)}
        onQueueTrack={onQueueTrack}
        onCreateMix={onCreateMix}
        onToggleFavorite={onToggleFavorite}
        pendingTrackId={pendingTrackId}
        creatingMixId={creatingMixId}
        favoriteTrackIds={favoriteTrackIds}
        favoriteDisabled={!libraryReady}
      />
    );
  }

  const hasCollectionItems = section.items.some((item) => item.kind !== "track");
  const { viewportRef, setItemRef } = useDiscoverRailFeaturedIndex(
    hasCollectionItems,
    section.items.length,
    section.id,
  );

  return (
    <section className="space-y-4">
      <SectionHeading
        icon={
          hasCollectionItems ? (
            <Layers3 className="h-4 w-4" />
          ) : (
            <Music2 className="h-4 w-4" />
          )
        }
        title={section.title}
        subtitle={section.subtitle}
      />
      <DiscoverHorizontalRail viewportRef={hasCollectionItems ? viewportRef : undefined}>
        {section.items.map((item, index) => (
          <div
            key={`${item.kind}:${item.id}`}
            ref={hasCollectionItems ? setItemRef(index) : undefined}
            className={cn(
              "snap-start overflow-visible",
              hasCollectionItems
                ? item.kind === "track"
                  ? "discover-rail-item discover-rail-item-track pt-1 pb-10"
                  : "discover-rail-item discover-rail-item-collection pt-1 pb-10"
                : "pt-1 pb-3",
            )}
          >
            {item.kind === "track" ? (
              <TrackDiscoverCard
                item={item}
                onQueueTrack={onQueueTrack}
                onCreateMix={onCreateMix}
                onToggleFavorite={onToggleFavorite}
                isPending={pendingTrackId === item.track.videoId}
                isCreatingMix={creatingMixId === item.track.videoId}
                isFavorite={favoriteTrackIds.has(item.track.videoId)}
                favoriteDisabled={!libraryReady}
              />
            ) : (
              <CollectionDiscoverCard
                item={item}
                onQueueCollection={onQueueCollection}
                isPending={pendingCollectionId === `${item.kind}:${item.id}`}
              />
            )}
          </div>
        ))}
      </DiscoverHorizontalRail>
    </section>
  );
}

function TopRequestedRail({
  entries,
  onQueueTrack,
  onCreateMix,
  onToggleFavorite,
  pendingTrackId,
  creatingMixId,
  favoriteTrackIds,
  libraryReady,
}: {
  entries: TopRequestedEntry[];
  onQueueTrack: (track: Track) => Promise<void>;
  onCreateMix: (track: Track) => Promise<void>;
  onToggleFavorite: (track: Track) => Promise<void>;
  pendingTrackId: string | null;
  creatingMixId: string | null;
  favoriteTrackIds: ReadonlySet<string>;
  libraryReady: boolean;
}) {
  if (entries.length === 0) {
    return (
      <Card className="rounded-[28px] p-6">
        <Empty
          title="本站熱門點播還在累積中"
          description="從 Discover、搜尋或 Mix 主動加入的歌曲，會逐步出現在這裡。"
        />
      </Card>
    );
  }

  return (
    <DiscoverHorizontalRail>
      {entries.map((entry) => (
        <TrackDiscoverCard
          key={entry.track.videoId}
          item={{
            kind: "track",
            id: entry.track.videoId,
            title: entry.track.title,
            artist: entry.track.artist,
            thumbnail: entry.track.thumbnail,
            duration: entry.track.duration,
            presentation: "song",
            track: entry.track,
          }}
          onQueueTrack={onQueueTrack}
          onCreateMix={onCreateMix}
          onToggleFavorite={onToggleFavorite}
          isPending={pendingTrackId === entry.track.videoId}
          isCreatingMix={creatingMixId === entry.track.videoId}
          isFavorite={favoriteTrackIds.has(entry.track.videoId)}
          favoriteDisabled={!libraryReady}
          rankingMeta={{
            rank: entry.rank,
            requestCount: entry.requestCount,
            lastRequestedAt: entry.lastRequestedAt,
          }}
        />
      ))}
    </DiscoverHorizontalRail>
  );
}

export const DiscoverView = ({ isMobile = false }: DiscoverViewProps) => {
  const [pendingTrackId, setPendingTrackId] = useState<string | null>(null);
  const [creatingMixId, setCreatingMixId] = useState<string | null>(null);
  const [pendingCollectionId, setPendingCollectionId] = useState<string | null>(
    null,
  );
  const initialize = useDiscoverStore((state) => state.initialize);
  const refreshMarkets = useDiscoverStore((state) => state.refreshMarkets);
  const refreshFeed = useDiscoverStore((state) => state.refreshFeed);
  const selectMarket = useDiscoverStore((state) => state.selectMarket);
  const selectMood = useDiscoverStore((state) => state.selectMood);
  const markets = useDiscoverStore((state) => state.markets);
  const selectedMarket = useDiscoverStore((state) => state.selectedMarket);
  const selectedMoodKey = useDiscoverStore((state) => state.selectedMoodKey);
  const moods = useDiscoverStore((state) => state.moods);
  const sections = useDiscoverStore((state) => state.sections);
  const warnings = useDiscoverStore((state) => state.warnings);
  const topRequested = useDiscoverStore((state) => state.topRequested);
  const fetchedAt = useDiscoverStore((state) => state.fetchedAt);
  const isMarketsLoading = useDiscoverStore((state) => state.isMarketsLoading);
  const isFeedLoading = useDiscoverStore((state) => state.isFeedLoading);
  const marketsError = useDiscoverStore((state) => state.marketsError);
  const feedError = useDiscoverStore((state) => state.feedError);
  const libraryReady = useLibraryStore((state) => state.ready);
  const favorites = useLibraryStore((state) => state.snapshot?.favorites ?? []);
  const saveMix = useLibraryStore((state) => state.saveMix);
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const currentRequester = useLibraryStore((state) =>
    getCurrentRequester(state.snapshot),
  );
  const { showToast } = useToast();
  const favoriteTrackIds = useMemo(
    () => new Set(favorites.map((favorite) => favorite.videoId)),
    [favorites],
  );
  const selectedMarketLabel =
    markets.find((market) => market.code === selectedMarket)?.label ?? "台灣";

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const handleQueueTrack = async (track: Track) => {
    setPendingTrackId(track.videoId);

    try {
      const response = await api.queueDiscoverTrack(track, currentRequester);

      if (!response.success) {
        showToast({ message: response.error || "加入佇列失敗", type: "error" });
        return;
      }

      showToast({ message: `已加入播放佇列：${track.title}`, type: "success" });
      void refreshMarkets();
    } finally {
      setPendingTrackId(null);
    }
  };

  const handleCreateMix = async (track: Track) => {
    setCreatingMixId(track.videoId);

    try {
      const response = await api.createMix(track, currentRequester);

      if (!response.success || !response.data) {
        showToast({ message: response.error || "建立 Mix 失敗", type: "error" });
        return;
      }

      void saveMix(track, response.data.tracks);
      showToast({
        message: `已建立 Mix，加入 ${response.data.count} 首歌曲`,
        type: "success",
      });
      void refreshMarkets();
    } finally {
      setCreatingMixId(null);
    }
  };

  const handleToggleFavorite = async (track: Track) => {
    if (!libraryReady) {
      showToast({ message: "媒體庫正在初始化", type: "info" });
      return;
    }

    const wasFavorite = favoriteTrackIds.has(track.videoId);

    try {
      await toggleFavorite(track);
      showToast({
        message: wasFavorite ? "已移除收藏" : "已加入收藏",
        type: "success",
      });
    } catch {
      showToast({ message: "收藏更新失敗", type: "error" });
    }
  };

  const handleQueueCollection = async (item: DiscoverCollectionItem) => {
    const pendingId = `${item.kind}:${item.id}`;
    setPendingCollectionId(pendingId);

    try {
      const response = await api.queueDiscoverCollection(
        item.kind,
        item.id,
        currentRequester,
      );

      if (!response.success || !response.data) {
        showToast({
          message: response.error || "加入整組內容失敗",
          type: "error",
        });
        return;
      }

      showToast({
        message: `已加入 ${response.data.count} 首歌曲`,
        type: "success",
      });
      void refreshMarkets();
    } finally {
      setPendingCollectionId(null);
    }
  };

  return (
    <Card
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none lg:rounded-[32px] lg:border lg:bg-[var(--surface-elevated)] lg:p-0 lg:shadow-[var(--surface-shadow)] ${
        isMobile ? "border-0 bg-transparent shadow-none" : ""
      }`}
    >
      <ScrollArea
        className={`min-h-0 flex-1 ${
          isMobile ? "px-4 pb-[184px] pt-4" : "desktop-scrollbar p-5 xl:p-6"
        }`}
        maxHeight="none"
      >
        <div className="space-y-6">
          <Card className="surface-card-strong overflow-hidden rounded-[30px] border p-5 lg:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  <Compass className="h-4 w-4 text-[var(--accent)]" />
                  Discover
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] lg:text-[2rem]">
                    看看 {selectedMarketLabel} 現在都在聽什麼
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--text-secondary)] lg:text-base">
                    直接切換不同市場與情境，快速比較台灣、美國、日本、韓國等地區的 YouTube Music 探索內容。
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                <div className="rounded-[18px] border border-[color:var(--surface-border)] bg-[var(--surface-subtle)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    更新時間
                  </p>
                  <p className="mt-1 font-medium text-[var(--text-primary)]">
                    {formatFetchedAt(fetchedAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void refreshFeed();
                  }}
                  disabled={isFeedLoading}
                  className="rounded-[18px]"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isFeedLoading ? "animate-spin" : ""}`}
                  />
                  重新整理
                </Button>
              </div>
            </div>
          </Card>

          <section className="space-y-4">
            <SectionHeading
              icon={<Music2 className="h-4 w-4" />}
              title="本站熱門點播"
              subtitle="只統計使用者主動加入的歌曲，方便快速看到目前站內最常被點播的內容。"
            />
            <TopRequestedRail
              entries={topRequested}
              onQueueTrack={handleQueueTrack}
              onCreateMix={handleCreateMix}
              onToggleFavorite={handleToggleFavorite}
              pendingTrackId={pendingTrackId}
              creatingMixId={creatingMixId}
              favoriteTrackIds={favoriteTrackIds}
              libraryReady={libraryReady}
            />
          </section>

          <section className="space-y-4">
            <SectionHeading
              icon={<Globe2 className="h-4 w-4" />}
              title="市場"
              subtitle="固定支援 8 個市場，讓你快速切換不同國家與地區的探索內容。"
            />
            {marketsError ? (
              <Card className="rounded-[24px] p-4 text-sm text-[#b42318]">
                {marketsError}
              </Card>
            ) : (
              <div className="flex flex-wrap gap-2">
                {markets.map((market) => (
                  <MarketChip
                    key={market.code}
                    label={market.label}
                    active={market.code === selectedMarket}
                    disabled={isMarketsLoading || isFeedLoading}
                    onClick={() => {
                      void selectMarket(market.code);
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeading
              icon={<Radio className="h-4 w-4" />}
              title="情境與類型"
              subtitle="分類會依目前市場動態變化；如果該分類失效，系統會自動回到該市場的基礎探索內容。"
            />
            {isFeedLoading && sections.length === 0 ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : moods.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <MarketChip
                  label="全部"
                  active={selectedMoodKey == null}
                  disabled={isFeedLoading}
                  onClick={() => {
                    void selectMood(null);
                  }}
                />
                {moods.map((mood) => (
                  <MarketChip
                    key={mood.key}
                    label={mood.label}
                    active={mood.key === selectedMoodKey}
                    disabled={isFeedLoading}
                    onClick={() => {
                      void selectMood(mood.key);
                    }}
                  />
                ))}
              </div>
            ) : (
              <Card className="rounded-[24px] p-4 text-sm text-[var(--text-secondary)]">
                這個市場目前沒有可用的情境與類型分類，會直接顯示市場探索內容。
              </Card>
            )}
          </section>

          {feedError ? (
            <Card className="rounded-[24px] p-4 text-sm text-[#b42318]">
              {feedError}
            </Card>
          ) : null}

          <WarningList warnings={warnings} />

          {sections.length === 0 && !isFeedLoading ? (
            <Card className="rounded-[28px] p-6">
              <Empty
                title="這個市場目前沒有可顯示的 Discover 區塊"
                description="你可以切換其他市場，或稍後重新整理看看。"
              />
            </Card>
          ) : (
            sections.map((section) => (
              <DiscoverSectionRail
                key={section.id}
                section={section}
                onQueueTrack={handleQueueTrack}
                onCreateMix={handleCreateMix}
                onToggleFavorite={handleToggleFavorite}
                onQueueCollection={handleQueueCollection}
                pendingTrackId={pendingTrackId}
                creatingMixId={creatingMixId}
                pendingCollectionId={pendingCollectionId}
                favoriteTrackIds={favoriteTrackIds}
                libraryReady={libraryReady}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
