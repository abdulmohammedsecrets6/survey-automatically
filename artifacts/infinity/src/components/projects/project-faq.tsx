import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Link2,
  MessageSquare,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";

interface FAQItem {
  q: string;
  a: string;
  sources: string[];
}

interface ProjectFAQProps {
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

export function ProjectFAQ({ projectId, projectName, onBack }: ProjectFAQProps) {
  const { t, lang } = useI18n();
  const locale = lang === "nl" ? "nl-NL" : "en-GB";
  const [faq, setFaq] = useState<FAQItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const loadFAQ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/faq`);
      if (!response.ok) throw new Error("Failed to load FAQ");
      const data = await response.json();
      setFaq(data.faq);
      setCached(data.cached ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const generateFAQ = useCallback(async (force = false) => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/faq/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRegenerate: force }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed (${response.status})`);
      }
      const data = await response.json();
      setFaq(data.faq);
      setCached(data.cached ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadFAQ();
  }, [loadFAQ]);

  const renderContent = (content: string, sources?: string[]) => {
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
            : citation.type === "conversation" ? "projectChatbot.source.conversation"
            : "projectChatbot.source.conversation";
        parts.push(
          <span
            key={key++}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium text-primary bg-primary/10 mx-0.5"
            title={citation.ref}
          >
            {citation.type === "file" ? <FileText className="h-2.5 w-2.5" /> : <Link2 className="h-2.5 w-2.5" />}
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

    return (
      <div className="space-y-2">
        <div className="text-sm leading-6 text-foreground whitespace-pre-wrap">{parts}</div>
        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mr-1">
              {t("projectFaq.sources")}
            </span>
            {sources.map((src, i) => {
              const citation = parseCitation(src);
              if (!citation) return null;
              const labelKey: TranslationKey =
                citation.type === "memory" ? "projectChatbot.source.memory"
                  : citation.type === "file" ? "projectChatbot.source.file"
                  : citation.type === "research" ? "projectChatbot.source.research"
                  : "projectChatbot.source.conversation";
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition cursor-default"
                  title={citation.ref}
                >
                  {citation.type === "file" ? <FileText className="h-2.5 w-2.5" /> : <Link2 className="h-2.5 w-2.5" />}
                  {t(labelKey)}
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-4 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("projectFaq.back")}
        </button>

        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-card/70 p-5 shadow-apple-xl sm:p-6"
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-500">
                <Bot className="h-4 w-4" />
                {t("projectFaq.eyebrow")}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("projectFaq.title")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("projectFaq.description")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {faq && faq.length > 0 && (
                <button
                  type="button"
                  onClick={() => generateFAQ(true)}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  {generating ? t("projectFaq.generating") : t("projectFaq.regenerate")}
                </button>
              )}
              {(!faq || faq.length === 0) && (
                <button
                  type="button"
                  onClick={() => generateFAQ(false)}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {generating ? t("projectFaq.generating") : t("projectFaq.generate")}
                </button>
              )}
            </div>
          </div>
        </motion.header>

        {error && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-600 dark:text-rose-300">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
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

        {cached && faq && faq.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <Sparkles className="h-3.5 w-3.5" />
            {t("projectFaq.emptyDescription")}
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
              <p className="mt-4 text-sm text-muted-foreground">{t("projectFaq.generating")}</p>
            </motion.div>
          ) : !faq || faq.length === 0 ? (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="liquid-glass flex min-h-[35vh] flex-col items-center justify-center rounded-3xl border border-border/40 p-8 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
                <Sparkles className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{t("projectFaq.emptyTitle")}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t("projectFaq.emptyDescription")}</p>
              {!generating && (
                <button
                  type="button"
                  onClick={() => generateFAQ(false)}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("projectFaq.generate")}
                </button>
              )}
            </motion.section>
          ) : (
            <div className="space-y-3">
              {faq.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="liquid-glass rounded-2xl border border-border/40 overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-4 p-4 text-left transition hover:bg-primary/3"
                    onClick={() => {}}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground pr-4">{item.q}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 transition-transform duration-200" />
                  </button>
                  <div className="border-t border-border/30 px-4 py-4">
                    {renderContent(item.a, item.sources)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}