import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Check,
  FileText,
  Loader2,
  MessageSquare,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";

interface ConflictItem {
  id: string;
  projectId: string;
  claimA: string;
  sourceA: string;
  claimB: string;
  sourceB: string;
  severity: "high" | "medium" | "low";
  resolved: string[];
  detectedAt: string;
  resolvedAt: string | null;
}

interface ProjectConflictsProps {
  projectId: string;
  projectName?: string;
  onBack: () => void;
}

/**
 * Parse a citation chip string like "[memory:xyz]" into a clickable source.
 */
function parseCitation(citation: string): { type: string; ref: string } | null {
  const match = citation.match(/^\[(memory|file|research|conversation|instruction):(.+)\]$/i);
  if (!match) return null;
  return { type: match[1].toLowerCase(), ref: match[2].trim() };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ProjectConflicts({ projectId, projectName, onBack }: ProjectConflictsProps) {
  const { t, lang } = useI18n();
  const locale = lang === "nl" ? "nl-NL" : "en-GB";
  const [conflicts, setConflicts] = useState<ConflictItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const loadConflicts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/conflicts`);
      if (!response.ok) throw new Error("Failed to load conflicts");
      const data = await response.json();
      setConflicts(data.conflicts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const scanConflicts = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/conflicts/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRescan: true }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed (${response.status})`);
      }
      const data = await response.json();
      setConflicts(data.conflicts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setScanning(false);
    }
  }, [projectId]);

  const dismissConflict = useCallback(async (conflictId: string) => {
    // Optimistic update - remove from list
    setConflicts((prev) => prev?.filter((c) => c.id !== conflictId) ?? []);
    // TODO: Add API call to mark as resolved/dismissed
  }, []);

  const resolveConflict = useCallback(async (conflictId: string, action: string) => {
    // Optimistic update - could add resolution action to the conflict
    setConflicts((prev) =>
      prev?.map((c) =>
        c.id === conflictId ? { ...c, resolved: [...(c.resolved || []), action], resolvedAt: new Date().toISOString() } : c
      ) ?? []
    );
    // TODO: Add API call to record resolution
  }, []);

  useEffect(() => {
    loadConflicts();
  }, [loadConflicts]);

  const renderContent = (content: string) => {
    // Split content to interleave inline citation chips [memory:...], [file:...], etc.
    const parts: React.ReactNode[] = [];
    const regex = /\[(memory|file|research|conversation|instruction):[^\]]+\]/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      const citation = parseCitation(match[0]);
      if (citation) {
        const labelKey: TranslationKey =
          citation.type === "memory" ? "projectChatbot.source.memory"
            : citation.type === "file" ? "projectChatbot.source.file"
            : citation.type === "research" ? "projectChatbot.source.research"
            : "projectChatbot.source.conversation";
        parts.push(
          <span
            key={key++}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium text-primary bg-primary/10 mx-0.5"
            title={citation.ref}
          >
            {citation.type === "file" ? <FileText className="h-2.5 w-2.5" /> : <MessageSquare className="h-2.5 w-2.5" />}
            {t(labelKey)}
          </span>,
        );
      } else {
        parts.push(match[0]);
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return <div className="text-sm leading-6 text-foreground whitespace-pre-wrap">{parts}</div>;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400";
      case "medium": return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "low": return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      default: return "border-border/40 bg-background/50 text-muted-foreground";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high": return <AlertTriangle className="h-3.5 w-3.5" />;
      case "medium": return <AlertTriangle className="h-3.5 w-3.5" />;
      case "low": return <FileText className="h-3.5 w-3.5" />;
      default: return <FileText className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 pb-4 pt-4 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("projectConflicts.back")}
        </button>

        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-card/70 p-5 shadow-apple-xl sm:p-6"
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-rose-500/15 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-500">
                <AlertTriangle className="h-4 w-4" />
                {t("projectConflicts.eyebrow")}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("projectConflicts.title")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("projectConflicts.description")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={scanConflicts}
                disabled={scanning}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-rose-500-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                {scanning ? t("projectConflicts.scanning") : t("projectConflicts.scan")}
              </button>
            </div>
          </div>
        </motion.header>

        {error && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-600 dark:text-rose-300">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded-full border border-current/20 px-3 py-1.5 font-medium transition hover:bg-rose-500/10"
            >
              {t("projectChatbot.dismiss")}
            </button>
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="liquid-glass flex min-h-[35vh] flex-col items-center justify-center rounded-3xl border border-border/40 p-8 text-center"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">{t("projectConflicts.scanning")}</p>
            </motion.div>
          ) : !conflicts || conflicts.length === 0 ? (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="liquid-glass flex min-h-[35vh] flex-col items-center justify-center rounded-3xl border border-border/40 p-8 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{t("projectConflicts.emptyTitle")}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t("projectConflicts.emptyDescription")}</p>
              {!scanning && (
                <button
                  type="button"
                  onClick={scanConflicts}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-semibold text-rose-500-foreground transition hover:opacity-90"
                >
                  <Search className="h-3.5 w-3.5" />
                  {t("projectConflicts.scan")}
                </button>
              )}
            </motion.section>
          ) : (
            <div className="space-y-3">
              {conflicts.map((conflict, index) => {
                const isExpanded = expandedIds.has(conflict.id);
                return (
                  <motion.div
                    key={conflict.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`liquid-glass rounded-2xl border border-border/40 overflow-hidden ${getSeverityColor(conflict.severity)}`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(conflict.id)) next.delete(conflict.id);
                          else next.add(conflict.id);
                          return next;
                        })
                      }
                      className="w-full flex items-center justify-between gap-4 p-4 text-left transition hover:bg-primary/3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
                          {getSeverityIcon(conflict.severity)}
                          <span className={getSeverityColor(conflict.severity).replace("bg-", "bg-").replace("text-", "text-").replace("border-", "border-")}>
                            {t(`projectConflicts.severity${conflict.severity.charAt(0).toUpperCase() + conflict.severity.slice(1)}` as TranslationKey)}
                          </span>
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{t("projectConflicts.claimA")}</p>
                          <p className="text-xs text-muted-foreground truncate">{conflict.sourceA}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground/70 hidden sm:block">
                          {formatDate(conflict.detectedAt)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground/50 transition-transform duration-200" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground/50 transition-transform duration-200" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="border-t border-border/30 px-4 py-4 space-y-4"
                      >
                        <div className="space-y-2 p-3 rounded-xl bg-background/50 border border-border/30">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                              {t("projectConflicts.claimA")}
                            </span>
                          </div>
                          {renderContent(conflict.claimA)}
                          <div className="text-xs text-muted-foreground/70 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {conflict.sourceA}
                          </div>
                        </div>

                        <div className="space-y-2 p-3 rounded-xl bg-background/50 border border-border/30">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-500">
                              {t("projectConflicts.claimB")}
                            </span>
                          </div>
                          {renderContent(conflict.claimB)}
                          <div className="text-xs text-muted-foreground/70 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {conflict.sourceB}
                          </div>
                        </div>

                        {conflict.resolved && conflict.resolved.length > 0 && (
                          <div className="space-y-1 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Resolved
                            </div>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {conflict.resolved.map((action, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                                  {action}
                                </li>
                              ))}
                            </ul>
                            {conflict.resolvedAt && (
                              <div className="text-[10px] text-muted-foreground/60 mt-1">
                                Resolved {formatDate(conflict.resolvedAt)}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                          <button
                            type="button"
                            onClick={() => resolveConflict(conflict.id, "Marked as reviewed")}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Mark reviewed
                          </button>
                          <button
                            type="button"
                            onClick={() => dismissConflict(conflict.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-rose-500/40 hover:text-rose-500"
                          >
                            <X className="h-3.5 w-3.5" />
                            {t("projectConflicts.dismiss")}
                          </button>
                          <button
                            type="button"
                            onClick={() => resolveConflict(conflict.id, "Updated memory")}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-emerald-500/40 hover:text-emerald-500"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Update memory
                          </button>
                          <button
                            type="button"
                            onClick={() => resolveConflict(conflict.id, "Created task")}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-amber-500/40 hover:text-amber-500"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Create task
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}