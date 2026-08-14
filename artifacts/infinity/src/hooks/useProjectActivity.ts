import { useCallback, useEffect, useMemo, useState } from "react";

export interface ActivityRecord {
  id: string;
  projectId: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface UseProjectActivityOptions {
  projectId: string;
  /** Initial activity records (e.g., from server-side render or preview) */
  initialActivity?: ActivityRecord[];
  /** Whether to auto-fetch on mount */
  autoFetch?: boolean;
  /** Page size for pagination */
  pageSize?: number;
}

export interface UseProjectActivityReturn {
  activity: ActivityRecord[];
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  /** Total count of all loaded items (including paginated) */
  totalCount: number;
}

const ACTIVITY_TYPES = [
  "project_created",
  "conversation_started",
  "file_uploaded",
  "file_changed",
  "research_completed",
  "memory_added",
  "memory_updated",
  "instruction_added",
  "task_added",
  "task_completed",
  "agent_ran",
  "faq_generated",
  "conflict_detected",
  "cleanup_ran",
  "import_completed",
  "export_completed",
  "automation_triggered",
  "connector_sync",
  "shared_access",
] as const;

/** Type-safe fetch helper for project activity API */
async function fetchProjectActivity(
  projectId: string,
  cursor?: string,
  limit = 50,
): Promise<{ activity: ActivityRecord[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);

  const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/activity?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Could not load activity");
  }
  const data = await response.json();

  // Handle both array and wrapped { activity: [...] } formats
  let items: ActivityRecord[] = [];
  if (Array.isArray(data)) {
    items = data as ActivityRecord[];
  } else if (typeof data === "object" && data !== null && Array.isArray((data as { activity?: unknown }).activity)) {
    items = (data as { activity: ActivityRecord[] }).activity;
  }

  return {
    activity: items,
    nextCursor: (data.nextCursor as string | null) ?? null,
  };
}

/**
 * Shared hook for fetching and managing project activity.
 * Used by both `ProjectActivity` (full timeline view) and `ProjectHome` (preview).
 */
export function useProjectActivity({
  projectId,
  initialActivity = [],
  autoFetch = true,
  pageSize = 50,
}: UseProjectActivityOptions): UseProjectActivityReturn {
  const [activity, setActivity] = useState<ActivityRecord[]>(initialActivity);
  const [loading, setLoading] = useState(autoFetch && initialActivity.length === 0);
  const [error, setError] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadActivity = useCallback(
    async (signal?: AbortSignal, cursor?: string) => {
      const isLoadingMore = !!cursor;
      if (isLoadingMore) setLoadingMore(true);
      else setLoading(true);
      setError(false);

      try {
        const { activity: items, nextCursor: newCursor } = await fetchProjectActivity(projectId, cursor, pageSize);
        if (isLoadingMore) {
          setActivity((current) => [...current, ...items]);
        } else {
          setActivity(items);
        }
        setNextCursor(newCursor);
        setHasMore(!!newCursor);
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setError(true);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [projectId, pageSize],
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || !hasMore) return;
    const controller = new AbortController();
    await loadActivity(controller.signal, nextCursor);
  }, [loadActivity, nextCursor, loadingMore, hasMore]);

  const refetch = useCallback(async () => {
    const controller = new AbortController();
    await loadActivity(controller.signal);
  }, [loadActivity]);

  useEffect(() => {
    if (!autoFetch || initialActivity.length > 0) return;
    const controller = new AbortController();
    // Small delay to allow parent to render first
    const timer = window.setTimeout(() => {
      void loadActivity(controller.signal);
    }, 150);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadActivity, autoFetch, initialActivity.length]);

  const totalCount = useMemo(() => activity.length, [activity.length]);

  return {
    activity,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
    totalCount,
  };
}

/**
 * Filter activity by search query and selected types.
 * Separated from fetch logic so components can control filtering independently.
 */
export function useActivityFilter(
  activity: ActivityRecord[],
  searchQuery: string,
  selectedTypes: Set<string>,
) {
  return useMemo(() => {
    let result = activity;

    // Filter by selected types (if not all selected)
    if (selectedTypes.size > 0 && selectedTypes.size < ACTIVITY_TYPES.length) {
      result = result.filter((a) => selectedTypes.has(a.type));
    }

    // Filter by search query
    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(
      (a) =>
        a.description.toLowerCase().includes(q) || a.type.toLowerCase().includes(q),
    );
  }, [activity, searchQuery, selectedTypes]);
}

/**
 * Group activity records by day for timeline rendering.
 */
export function useActivityGrouping(activity: ActivityRecord[]) {
  return useMemo(() => {
    const groups: { day: string; items: ActivityRecord[] }[] = [];

    function getDayKey(value: string): string {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "unknown";
      return date.toISOString().slice(0, 10); // YYYY-MM-DD
    }

    for (const item of activity) {
      const day = getDayKey(item.createdAt);
      const existing = groups.find((g) => g.day === day);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({ day, items: [item] });
      }
    }
    return groups;
  }, [activity]);
}

/**
 * Build a deep-link target for an activity record.
 * Conversations → /c/:id; files → /files/:id; others → null.
 */
export function buildActivityLink(item: ActivityRecord): string | null {
  switch (item.type) {
    case "conversation_started":
    case "conversation_moved":
    case "conversation_removed": {
      const match = item.description.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      );
      return match ? `/c/${match[0]}` : null;
    }
    case "file_uploaded":
    case "file_changed": {
      const match = item.description.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      );
      return match ? `/files/${match[0]}` : null;
    }
    default:
      return null;
  }
}

/** Activity type icons (emoji) */
const ACTIVITY_ICONS: Record<string, string> = {
  project_created: "📁",
  conversation_started: "💬",
  file_uploaded: "📄",
  file_changed: "📝",
  research_completed: "🔬",
  memory_added: "🧠",
  memory_updated: "🧠",
  instruction_added: "📋",
  task_added: "✅",
  task_completed: "✅",
  agent_ran: "🤖",
  faq_generated: "❓",
  conflict_detected: "⚠️",
  cleanup_ran: "🧹",
  import_completed: "📥",
  export_completed: "📤",
  automation_triggered: "⚡",
  connector_sync: "🔗",
  shared_access: "🔒",
};export function getActivityIcon(type: string): string {
  return ACTIVITY_ICONS[type] ?? "📌";
}
