"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Brain,
  Info,
  Loader2,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRewireAgent } from "@/components/command-centre/use-rewire-agent";
import type { LandscapeMetrics, MapRegion } from "@/lib/landscape-core";
import type { OrganisationResultFilter } from "@/lib/landscape-results";
import type {
  RewireAgentIntent,
  RewireAgentUIMessage,
} from "@/lib/rewire-agent/types";
import { cn } from "@/lib/utils";

type Preset = {
  intent: Exclude<RewireAgentIntent, "custom">;
  label: string;
  prompt: string;
};

const presets: Preset[] = [
  {
    intent: "explain_view",
    label: "Explain Current Selection",
    prompt:
      "Show the key takeaway first. Then explain the current REWIRE command-centre view across filters, result count, regional distribution, supply-chain profile, material profile, actor mix, top organisations, strategic signals, and data caveats.",
  },
  {
    intent: "summarize_insights",
    label: "Summarize Important Insights",
    prompt:
      "Summarize important insights for the current REWIRE scope. Using short one paragraph to show the key takeaway first. Then prioritize the most decision-relevant signals, implications, and caveats.",
  },
];

function getMessageText(message: RewireAgentUIMessage) {
  return message.parts
    .filter(
      (part): part is Extract<(typeof message.parts)[number], { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("");
}

function isToolPart(
  part: RewireAgentUIMessage["parts"][number],
): part is Extract<
  RewireAgentUIMessage["parts"][number],
  { type: `tool-${string}` }
> {
  return part.type.startsWith("tool-");
}

function toolLabel(type: string) {
  return type === "tool-rewire_summarize_insights"
    ? "Model viewed insights"
    : "Model viewed context";
}

function ToolStatus({
  part,
}: {
  part: Extract<RewireAgentUIMessage["parts"][number], { type: `tool-${string}` }>;
}) {
  const isDone = part.state === "output-available";
  const isError = part.state === "output-error";
  const resultCount =
    isDone && part.output?.ok
      ? part.output.context.currentResultCount.selected
      : null;
  const region =
    isDone && part.output?.ok ? part.output.context.scope.activeRegion : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground",
        isError && "border-destructive/30 bg-destructive/5 text-destructive",
      )}
    >
      {isDone ? (
        <Sparkles aria-hidden="true" />
      ) : isError ? (
        <Brain aria-hidden="true" />
      ) : (
        <Loader2 aria-hidden="true" className="animate-spin" />
      )}
      <span className="font-medium text-foreground">{toolLabel(part.type)}</span>
      <span>
        {isDone
          ? `attached${resultCount === null ? "" : ` · ${resultCount} results`}${
              region ? ` · ${region}` : ""
            }`
          : isError
            ? part.errorText
            : "reading current view"}
      </span>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="animate-spin" />
        Thinking
      </div>
    </div>
  );
}

function AnswerNotice() {
  return (
    <span className="group relative inline-flex">
      <span
        tabIndex={0}
        aria-label="AI answer note"
        className="inline-flex cursor-help items-center rounded-full text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-3.5"
      >
        <Info aria-hidden="true" />
      </span>
      <span className="pointer-events-none absolute right-0 bottom-full mb-2 hidden w-60 rounded-md border bg-popover px-3 py-2 text-xs leading-5 text-popover-foreground shadow-lg group-hover:block group-focus-within:block">
        AI may generate unexpected content. If something looks off, use the
        refresh icon above to retry.
      </span>
    </span>
  );
}

function MarkdownText({ text }: { text: string }) {
  return (
    <div className="min-w-0 text-sm leading-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>;
          },
          ul({ children }) {
            return <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>;
          },
          ol({ children }) {
            return (
              <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>
            );
          },
          li({ children }) {
            return <li className="pl-1">{children}</li>;
          },
          code({ children }) {
            return (
              <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
                {children}
              </code>
            );
          },
          pre({ children }) {
            return (
              <pre className="mb-2 overflow-x-auto rounded-md bg-muted p-3 text-xs last:mb-0">
                {children}
              </pre>
            );
          },
          a({ children, href }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="mb-2 overflow-x-auto last:mb-0">
                <table className="w-full border-collapse text-xs">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border px-2 py-1 text-left font-medium">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="border px-2 py-1 align-top">{children}</td>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function MessageBubble({ message }: { message: RewireAgentUIMessage }) {
  const text = getMessageText(message);
  const toolParts = message.parts.filter(isToolPart);
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <article
        className={cn(
          "grid max-w-[92%] gap-2 rounded-lg px-3 py-2 text-sm leading-6",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border bg-background text-foreground",
        )}
      >
        {toolParts.map((part) => (
          <ToolStatus key={part.toolCallId} part={part} />
        ))}

        {text ? (
          isUser ? (
            <p className="whitespace-pre-wrap">{text}</p>
          ) : (
            <MarkdownText text={text} />
          )
        ) : null}
      </article>
    </div>
  );
}

export function RewireAgent({
  metrics,
  sourceName,
  activeFilter,
  activeRegion,
}: {
  metrics: LandscapeMetrics;
  sourceName: string;
  activeFilter: OrganisationResultFilter;
  activeRegion: MapRegion | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [launcherExpanded, setLauncherExpanded] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [launcherDraft, setLauncherDraft] = useState("");
  const launcherInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const {
    clearContext,
    error,
    isRestoringSession,
    messages,
    regenerate,
    sendAgentMessage,
    status,
    stop,
    viewContext,
  } = useRewireAgent({
    metrics,
    sourceName,
    activeFilter,
    activeRegion,
  });
  const isBusy = status === "submitted" || status === "streaming";
  const hasLauncherText = launcherDraft.trim().length > 0;
  const surfaceOpen = dialogOpen || trayOpen || launcherExpanded;
  const resultLabel = useMemo(
    () =>
      `${viewContext.currentResultCount.selected} of ${viewContext.currentResultCount.total} organisations`,
    [viewContext.currentResultCount.selected, viewContext.currentResultCount.total],
  );

  function openLauncher() {
    setLauncherExpanded(true);
    setTrayOpen(true);
    if (messages.length > 0) {
      setDialogOpen(true);
    }
    window.setTimeout(() => launcherInputRef.current?.focus(), 0);
  }

  function openAgentSurface() {
    openLauncher();
  }

  function closeAgentSurface() {
    setDialogOpen(false);
    setTrayOpen(false);
    setLauncherExpanded(false);
  }

  async function runLauncherAction() {
    if (!launcherExpanded) {
      openAgentSurface();
      return;
    }

    if (isBusy) {
      await stop();
      return;
    }

    const text = launcherDraft.trim();

    if (!text) {
      setTrayOpen(true);
      launcherInputRef.current?.focus();
      return;
    }

    setLauncherDraft("");
    await submitText(text, "custom");
  }

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [dialogOpen, messages.length, status]);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [dialogOpen]);

  async function submitText(text: string, intent: RewireAgentIntent) {
    const trimmed = text.trim();

    if (!trimmed || isBusy) {
      return;
    }

    setDialogOpen(true);
    setTrayOpen(false);
    setLauncherExpanded(true);
    await sendAgentMessage({ text: trimmed, intent });
  }

  async function submitPreset(preset: Preset) {
    const focus = launcherDraft.trim();
    const text = focus
      ? `${preset.prompt}\n\nAdditional focus: ${focus}`
      : preset.prompt;

    setLauncherDraft("");
    await submitText(text, preset.intent);
  }

  async function submitLauncher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = launcherDraft.trim();

    if (!text) {
      openLauncher();
      return;
    }

    setLauncherDraft("");
    await submitText(text, "custom");
  }

  return (
    <>
      {surfaceOpen && typeof document !== "undefined"
        ? createPortal(
            <button
              type="button"
              aria-label="Close Ask AI"
              className="fixed inset-0 z-30 cursor-default bg-foreground/10 animate-in fade-in-0 duration-150"
              onMouseDown={closeAgentSurface}
            />,
            document.body,
          )
        : null}
      <div
        className="relative flex items-center"
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        <div className="absolute right-0 bottom-full mb-3 flex w-[min(34rem,calc(100vw-2rem))] flex-col items-end gap-2">
          {dialogOpen ? (
            <section className="flex h-[min(64vh,36rem)] w-full flex-col overflow-hidden rounded-2xl border bg-popover shadow-2xl animate-in fade-in-0 slide-in-from-bottom-3 duration-200">
              <header className="border-b px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid min-w-0 gap-1">
                    <h2 className="flex items-center gap-2 text-sm font-medium">
                      <Bot aria-hidden="true" />
                      Ask AI
                    </h2>
                    <p className="truncate text-xs text-muted-foreground">
                      {viewContext.scope.resultContextLabel} · {resultLabel} ·{" "}
                      {viewContext.strategicSignals.length} signals
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant="secondary">
                      {activeRegion ?? "All regions"}
                    </Badge>
                    {isBusy ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => void stop()}
                        aria-label="Stop"
                      >
                        <Square aria-hidden="true" />
                      </Button>
                    ) : messages.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => void regenerate()}
                        aria-label="Retry"
                      >
                        <RotateCcw aria-hidden="true" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => void clearContext()}
                      disabled={isBusy && messages.length === 0}
                      aria-label="Clear"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDialogOpen(false)}
                      aria-label="Close Ask AI"
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </header>

              <div className="relative min-h-0 flex-1 overscroll-contain overflow-y-auto bg-muted/20 px-4 py-4">
                <div className="grid gap-4">
                  {error ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {error.message ||
                        "Something went wrong while talking to Ask AI."}
                    </div>
                  ) : null}

                  {isRestoringSession ? (
                    <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                      <Loader2 aria-hidden="true" className="animate-spin" />
                      Restoring session
                    </div>
                  ) : null}

                  {!isRestoringSession && messages.length === 0 ? (
                    <div className="grid min-h-40 place-items-center rounded-md border border-dashed bg-background px-4 text-center text-sm text-muted-foreground">
                      Ask about the current REWIRE view.
                    </div>
                  ) : null}

                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}

                  {isBusy ? <ThinkingIndicator /> : null}

                  <div ref={bottomRef} />
                </div>
                {messages.some((message) => message.role === "assistant") ? (
                  <div className="sticky right-0 bottom-0 ml-auto flex w-fit justify-end pt-2">
                    <AnswerNotice />
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <div
            className={cn(
              "w-[min(28rem,calc(100vw-2rem))] rounded-2xl border bg-popover p-2 shadow-2xl transition-all duration-200",
              surfaceOpen
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0",
            )}
            onMouseDown={(event) => event.preventDefault()}
          >
            <div className="flex flex-wrap justify-center gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.intent}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void submitPreset(preset)}
                  disabled={isBusy}
                  className="rounded-full"
                >
                  <Sparkles aria-hidden="true" data-icon="inline-start" />
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "relative h-11 overflow-hidden rounded-full transition-[width] duration-300 ease-out",
            launcherExpanded
              ? "w-[min(28rem,calc(100vw-6rem))]"
              : "w-11",
          )}
        >
          {launcherExpanded ? (
            <form
              onSubmit={submitLauncher}
              className="flex h-11 items-center rounded-full pr-12 pl-3"
            >
              <Input
                ref={launcherInputRef}
                value={launcherDraft}
                onChange={(event) => setLauncherDraft(event.target.value)}
                onFocus={() => {
                  setTrayOpen(true);
                  if (messages.length > 0) {
                    setDialogOpen(true);
                  }
                }}
                placeholder="Ask AI"
                className="h-9 min-w-0 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </form>
          ) : null}
          <Button
            type="button"
            size="icon-lg"
            onClick={() => void runLauncherAction()}
            disabled={launcherExpanded && !isBusy && !hasLauncherText}
            aria-label={
              launcherExpanded ? (isBusy ? "Stop" : "Send") : "Ask AI"
            }
            className="absolute top-1 right-1 rounded-full active:not-aria-[haspopup]:translate-y-0"
          >
            {isBusy ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : launcherExpanded ? (
              <SendHorizontal aria-hidden="true" />
            ) : (
              <Bot aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
