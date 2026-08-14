import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  FileText,
  Link2,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { useI18n, type TranslationKey } from "@/lib/i18n";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: string[];
  timestamp: string;
}

interface ProjectChatbotProps {
  projectId: string;
  projectName?: string;
  onBack: () => void;
}

interface SSEData {
  type: "token" | "sources" | "error" | "done";
  content?: string;
  message?: string;
}

/**
 * Parse a citation chip string like "[memory:xyz]" into a clickable source.
 */
function parseCitation(citation: string): { type: string; ref: string } | null {
  const match = citation.match(/^\[(memory|file|research|conversation):(.+)\]$/i);
  if (!match) return null;
  return { type: match[1].toLowerCase(), ref: match[2].trim() };
}

export function ProjectChatbot({ projectId, projectName, onBack }: ProjectChatbotProps) {
  const { t, lang } = useI18n();
  const locale = lang === "nl" ? "nl-NL" : "en-GB";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messageCounter = useRef(0);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const message = inputValue.trim();
    if (!message || isStreaming) return;

    setError(null);
    setInputValue("");

    const userMessage: ChatMessage = {
      id: `user-${messageCounter.current++}`,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    const assistantId = `assistant-${messageCounter.current++}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setStreamingMessageId(assistantId);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`/api/infinity/projects/${encodeURIComponent(projectId)}/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed (${response.status})`);
      }

      if (!response.body) {
        throw new Error("No response stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let collectedContent = "";
      let collectedSources: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const data: SSEData = JSON.parse(jsonStr);
            if (data.type === "token" && data.content) {
              collectedContent += data.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: collectedContent } : m,
                ),
              );
            } else if (data.type === "sources" && Array.isArray(data.content)) {
              collectedSources = data.content as string[];
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, sources: collectedSources } : m,
                ),
              );
            } else if (data.type === "error") {
              throw new Error(data.message || "Stream error");
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Stream error") {
              console.error("SSE parse error", parseErr);
            }
          }
        }
      }
    } catch (err) {
      const message2 = err instanceof Error ? err.message : "Unknown error";
      setError(message2);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: m.content || t("projectChatbot.streamError") }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
      abortRef.current = null;
    }
  }, [inputValue, isStreaming, projectId, t]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setStreamingMessageId(null);
  }, []);

  const handleReset = useCallback(() => {
    if (isStreaming) handleStop();
    setMessages([]);
    setError(null);
  }, [isStreaming, handleStop]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const renderContent = (content: string, sources?: string[]) => {
    // Split content to interleave inline citation chips [memory:...], [file:...], etc.
    const parts: React.ReactNode[] = [];
    const regex = /\[(memory|file|research|conversation):[^\]]+\]/gi;
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
              {t("projectChatbot.sources")}
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
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col px-4 pb-4 pt-4 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("projectChatbot.back")}
        </button>

        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-card/70 p-5 shadow-apple-xl sm:p-6"
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-500">
                <Bot className="h-4 w-4" />
                {t("projectChatbot.eyebrow")}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("projectChatbot.title")}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {projectName ? t("projectChatbot.descriptionNamed", { name: projectName }) : t("projectChatbot.description")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isStreaming}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("projectChatbot.newChat")}
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

        <div
          ref={scrollRef}
          className="mt-4 flex-1 space-y-4 overflow-y-auto pb-4"
        >
          {messages.length === 0 ? (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="liquid-glass mt-2 flex min-h-[35vh] flex-col items-center justify-center rounded-3xl border border-border/40 p-8 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Sparkles className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{t("projectChatbot.emptyTitle")}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t("projectChatbot.emptyDescription")}</p>
              <div className="mt-6 grid w-full max-w-md gap-2">
                {[
                  t("projectChatbot.example.goal"),
                  t("projectChatbot.example.stack"),
                  t("projectChatbot.example.progress"),
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setInputValue(example)}
                    className="rounded-xl border border-border/40 bg-background/50 px-4 py-2.5 text-left text-xs font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/5"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </motion.section>
          ) : (
            messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    message.role === "user"
                      ? "bg-primary/10 text-primary"
                      : "bg-emerald-500/10 text-emerald-500"
                  }`}
                >
                  {message.role === "user" ? (
                    <MessageSquare className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </span>
                <div
                  className={`max-w-[80%] rounded-2xl border px-4 py-3 ${
                    message.role === "user"
                      ? "border-primary/20 bg-primary/5"
                      : "border-border/40 bg-card/50"
                  }`}
                >
                  {message.role === "assistant" && !message.content && streamingMessageId === message.id ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("projectChatbot.thinking")}
                    </div>
                  ) : (
                    renderContent(message.content, message.sources)
                  )}
                  <div className="mt-2 flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
                    {new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(message.timestamp))}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="mt-4">
          <div className="liquid-glass rounded-2xl border border-border/40 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("projectChatbot.placeholder")}
                rows={1}
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-border/50 bg-background/70 px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/40"
              />
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 bg-background/70 text-foreground transition hover:border-primary/40"
                  aria-label={t("projectChatbot.stop")}
                >
                  <span className="h-3 w-3 rounded-sm bg-rose-500" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!inputValue.trim()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  aria-label={t("projectChatbot.send")}
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
