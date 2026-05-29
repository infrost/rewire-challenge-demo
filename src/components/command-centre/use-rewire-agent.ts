"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LandscapeMetrics, MapRegion } from "@/lib/landscape-core";
import type { OrganisationResultFilter } from "@/lib/landscape-results";
import {
  buildRewireAgentToolOutput,
  buildRewireAgentViewContext,
} from "@/lib/rewire-agent/view-context";
import {
  extractTrailingRewireToolCallXml,
  parseRewireAgentToolCallXml,
} from "@/lib/rewire-agent/tool-call-fallback";
import {
  deleteRewireAgentSession,
  loadRewireAgentSession,
  saveRewireAgentSession,
} from "@/lib/rewire-agent/session-db";
import type {
  RewireAgentIntent,
  RewireAgentToolName,
  RewireAgentUIMessage,
  RewireAgentViewContext,
} from "@/lib/rewire-agent/types";

const maxEmptyToolRetries = 1;
const maxMalformedToolRetries = 1;

function debugRewireAgent(message: string, data?: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (data === undefined) {
    console.info(`[rewire-agent] ${message}`);
    return;
  }

  console.info(`[rewire-agent] ${message}`, data);
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function buildSessionId(metrics: LandscapeMetrics, sourceName: string) {
  const firstOrganisation = metrics.organisations[0]?.id ?? "empty";
  const lastOrganisation =
    metrics.organisations[metrics.organisations.length - 1]?.id ?? "empty";
  const fingerprint = [
    sourceName,
    metrics.totals.organisations,
    metrics.importedSheets.join("|"),
    firstOrganisation,
    lastOrganisation,
  ].join("::");

  return `rewire-agent-v1:${hashText(fingerprint)}`;
}

function hasMessageText(message: RewireAgentUIMessage) {
  return message.parts.some(
    (part) => part.type === "text" && part.text.trim().length > 0,
  );
}

function hasToolPart(message: RewireAgentUIMessage) {
  return message.parts.some(
    (part) => part.type.startsWith("tool-") || part.type === "dynamic-tool",
  );
}

function isEmptyAssistantResponse(message: RewireAgentUIMessage | undefined) {
  return (
    !!message &&
    message.role === "assistant" &&
    !hasMessageText(message) &&
    !hasToolPart(message)
  );
}

function fallbackToolCallId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `rewire-fallback-${crypto.randomUUID()}`;
  }

  return `rewire-fallback-${Date.now().toString(36)}`;
}

function replaceMessageById(
  currentMessages: RewireAgentUIMessage[],
  fallbackMessages: RewireAgentUIMessage[],
  messageId: string,
  nextMessage: RewireAgentUIMessage,
) {
  const source = currentMessages.some((message) => message.id === messageId)
    ? currentMessages
    : fallbackMessages;

  return source.map((message) =>
    message.id === messageId ? nextMessage : message,
  );
}

function recoverLeakedToolCall({
  message,
  context,
}: {
  message: RewireAgentUIMessage;
  context: RewireAgentViewContext;
}):
  | {
      kind: "none";
    }
  | {
      kind: "parsed";
      source: "text" | "reasoning";
      message: RewireAgentUIMessage;
      toolCallId: string;
      toolName: RewireAgentToolName;
    }
  | {
      kind: "parse-error";
      source: "text" | "reasoning";
      message: RewireAgentUIMessage;
      errorText: string;
      rawXmlLength: number;
    } {
  if (message.role !== "assistant" || hasToolPart(message)) {
    return { kind: "none" };
  }

  for (let partIndex = message.parts.length - 1; partIndex >= 0; partIndex -= 1) {
    const part = message.parts[partIndex];

    if (part.type !== "text" && part.type !== "reasoning") {
      continue;
    }

    const leakedToolCall = extractTrailingRewireToolCallXml(part.text);

    if (!leakedToolCall) {
      continue;
    }

    const sanitizedParts: RewireAgentUIMessage["parts"] =
      message.parts.flatMap((candidate, index) => {
        if (index !== partIndex) {
          return [candidate];
        }

        if (!leakedToolCall.visibleText.trim()) {
          return [];
        }

        return [
          {
            ...part,
            text: leakedToolCall.visibleText,
            state: "done" as const,
          },
        ];
      });
    const sanitizedMessage: RewireAgentUIMessage = {
      ...message,
      parts: sanitizedParts,
    };

    try {
      const parsed = parseRewireAgentToolCallXml(leakedToolCall.rawXml);
      const toolCallId = fallbackToolCallId();
      const toolPart = {
        type: `tool-${parsed.toolName}`,
        toolCallId,
        state: "output-available",
        input: parsed.input,
        output: buildRewireAgentToolOutput({
          toolName: parsed.toolName,
          input: parsed.input,
          context,
        }),
      } as RewireAgentUIMessage["parts"][number];

      return {
        kind: "parsed",
        source: part.type,
        message: {
          ...sanitizedMessage,
          parts: [...sanitizedMessage.parts, toolPart],
        },
        toolCallId,
        toolName: parsed.toolName,
      };
    } catch (error) {
      return {
        kind: "parse-error",
        source: part.type,
        message: sanitizedMessage,
        errorText: errorText(error),
        rawXmlLength: leakedToolCall.rawXml.length,
      };
    }
  }

  return { kind: "none" };
}

export function useRewireAgent({
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
  const sessionId = useMemo(
    () => buildSessionId(metrics, sourceName),
    [metrics, sourceName],
  );
  const viewContext = useMemo(
    () =>
      buildRewireAgentViewContext({
        metrics,
        sourceName,
        activeFilter,
        activeRegion,
      }),
    [activeFilter, activeRegion, metrics, sourceName],
  );
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const currentIntentRef = useRef<RewireAgentIntent>("custom");
  const finalizeRef = useRef(false);
  const pendingAutoContinueRef = useRef(false);
  const pendingEmptyToolRetryRef = useRef(false);
  const pendingMalformedToolRetryRef = useRef(false);
  const emptyToolRetryCountRef = useRef(0);
  const malformedToolRetryCountRef = useRef(0);
  const malformedToolRetryMessageIdRef = useRef<string | null>(null);
  const toolCallsThisTurnRef = useRef(0);
  const turnIdRef = useRef(0);
  const skipNextSaveRef = useRef(false);
  const viewContextRef = useRef(viewContext);
  const sessionIdRef = useRef(sessionId);
  const addToolOutputRef =
    useRef<ReturnType<typeof useChat<RewireAgentUIMessage>>["addToolOutput"] | null>(
      null,
    );

  const transport = useMemo(
    () =>
      new DefaultChatTransport<RewireAgentUIMessage>({
        api: "/api/rewire-agent",
      }),
    [],
  );

  const {
    addToolOutput,
    clearError,
    error,
    messages,
    regenerate,
    sendMessage,
    setMessages,
    status,
    stop,
  } = useChat<RewireAgentUIMessage>({
    id: sessionId,
    transport,
    onToolCall({ toolCall }) {
      if (toolCall.dynamic) {
        debugRewireAgent("ignored dynamic tool call", {
          toolCallId: toolCall.toolCallId,
        });
        return;
      }

      const toolName = toolCall.toolName as RewireAgentToolName;

      if (
        toolName !== "rewire_explain_view" &&
        toolName !== "rewire_summarize_insights"
      ) {
        debugRewireAgent("ignored unknown tool call", {
          toolCallId: toolCall.toolCallId,
          toolName,
        });
        return;
      }

      const scheduledTurnId = turnIdRef.current;
      toolCallsThisTurnRef.current += 1;
      finalizeRef.current = true;
      pendingAutoContinueRef.current = true;
      debugRewireAgent("tool call received", {
        toolCallId: toolCall.toolCallId,
        toolName,
        toolCallsThisTurn: toolCallsThisTurnRef.current,
      });

      if (toolCallsThisTurnRef.current > 1) {
        window.setTimeout(() => {
          if (scheduledTurnId !== turnIdRef.current) {
            debugRewireAgent("skipped stale tool error output", {
              toolCallId: toolCall.toolCallId,
            });
            return;
          }

          void Promise.resolve(
            addToolOutputRef.current?.({
              tool: toolName,
              toolCallId: toolCall.toolCallId,
              state: "output-error",
              errorText:
                "Only one REWIRE view-context tool call is allowed per turn.",
          }),
        ).catch((error) => {
          console.error("[rewire-agent] failed to add tool error", error);
        });
        }, 0);
        return;
      }

      window.setTimeout(() => {
        if (scheduledTurnId !== turnIdRef.current) {
          debugRewireAgent("skipped stale tool output", {
            toolCallId: toolCall.toolCallId,
          });
          return;
        }

        const addToolOutput = addToolOutputRef.current;

        if (!addToolOutput) {
          pendingAutoContinueRef.current = false;
          finalizeRef.current = false;
          console.error("[rewire-agent] addToolOutput unavailable", {
            toolCallId: toolCall.toolCallId,
            toolName,
          });
          return;
        }

        debugRewireAgent("adding client tool output", {
          toolCallId: toolCall.toolCallId,
          toolName,
          resultCount:
            viewContextRef.current.currentResultCount.selected,
        });

        void Promise.resolve(
          addToolOutput({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: buildRewireAgentToolOutput({
              toolName,
              input: toolCall.input,
              context: viewContextRef.current,
            }),
          }),
        )
          .then(() => {
            debugRewireAgent("client tool output added", {
              toolCallId: toolCall.toolCallId,
              toolName,
            });
          })
          .catch((error) => {
            pendingAutoContinueRef.current = false;
            finalizeRef.current = false;
            console.error("[rewire-agent] failed to add tool output", error);
          });
      }, 0);
    },
    onFinish({ finishReason, message, messages: finishedMessages }) {
      debugRewireAgent("stream finished", {
        finishReason,
        messageParts: message.parts.map((part) => part.type),
        pendingAutoContinue: pendingAutoContinueRef.current,
        finalize: finalizeRef.current,
      });

      if (finishReason === "tool-calls") {
        return;
      }

      const leakedToolCall = recoverLeakedToolCall({
        message,
        context: viewContextRef.current,
      });

      if (leakedToolCall.kind === "parsed") {
        setMessages((currentMessages) =>
          replaceMessageById(
            currentMessages,
            finishedMessages,
            message.id,
            leakedToolCall.message,
          ),
        );
        finalizeRef.current = true;
        pendingAutoContinueRef.current = true;
        pendingEmptyToolRetryRef.current = false;
        pendingMalformedToolRetryRef.current = false;
        emptyToolRetryCountRef.current = 0;
        malformedToolRetryCountRef.current = 0;
        toolCallsThisTurnRef.current = 1;
        debugRewireAgent("recovered leaked XML tool call", {
          source: leakedToolCall.source,
          toolCallId: leakedToolCall.toolCallId,
          toolName: leakedToolCall.toolName,
        });
        return;
      }

      if (leakedToolCall.kind === "parse-error") {
        setMessages((currentMessages) =>
          replaceMessageById(
            currentMessages,
            finishedMessages,
            message.id,
            leakedToolCall.message,
          ),
        );

        if (malformedToolRetryCountRef.current < maxMalformedToolRetries) {
          pendingMalformedToolRetryRef.current = true;
          malformedToolRetryMessageIdRef.current = message.id;
          debugRewireAgent("scheduled malformed XML tool-call retry", {
            source: leakedToolCall.source,
            errorText: leakedToolCall.errorText,
            rawXmlLength: leakedToolCall.rawXmlLength,
            retry: malformedToolRetryCountRef.current + 1,
            maxRetries: maxMalformedToolRetries,
          });
          return;
        }

        debugRewireAgent("ignored malformed XML tool call after retries", {
          source: leakedToolCall.source,
          errorText: leakedToolCall.errorText,
          rawXmlLength: leakedToolCall.rawXmlLength,
        });
      }

      if (
        currentIntentRef.current !== "custom" &&
        !finalizeRef.current &&
        isEmptyAssistantResponse(message) &&
        emptyToolRetryCountRef.current < maxEmptyToolRetries
      ) {
        pendingEmptyToolRetryRef.current = true;
        debugRewireAgent("scheduled empty forced-tool retry", {
          intent: currentIntentRef.current,
          retry: emptyToolRetryCountRef.current + 1,
          maxRetries: maxEmptyToolRetries,
        });
        return;
      }

      finalizeRef.current = false;
      pendingAutoContinueRef.current = false;
      pendingMalformedToolRetryRef.current = false;
      malformedToolRetryMessageIdRef.current = null;
      toolCallsThisTurnRef.current = 0;
      emptyToolRetryCountRef.current = 0;
      malformedToolRetryCountRef.current = 0;
      currentIntentRef.current = "custom";
    },
  });

  useEffect(() => {
    viewContextRef.current = viewContext;
  }, [viewContext]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    addToolOutputRef.current = addToolOutput;
  }, [addToolOutput]);

  useEffect(() => {
    if (status !== "ready" || !pendingAutoContinueRef.current) {
      return;
    }

    const shouldContinue = lastAssistantMessageIsCompleteWithToolCalls({
      messages,
    });
    debugRewireAgent("client tool continuation check", {
      shouldContinue,
      messageCount: messages.length,
    });

    if (!shouldContinue) {
      return;
    }

    pendingAutoContinueRef.current = false;
    debugRewireAgent("continuing after client tool output", {
      intent: currentIntentRef.current,
      sessionId,
    });

    void sendMessage(undefined, {
      body: {
        sessionId,
        intent: currentIntentRef.current,
        finalize: true,
      },
    });
  }, [messages, sendMessage, sessionId, status]);

  const sendAgentMessage = useCallback(
    async ({
      text,
      intent = "custom",
    }: {
      text: string;
      intent?: RewireAgentIntent;
    }) => {
      const trimmed = text.trim();

      if (!trimmed || status === "submitted" || status === "streaming") {
        return;
      }

      clearError();
      turnIdRef.current += 1;
      currentIntentRef.current = intent;
      finalizeRef.current = false;
      pendingAutoContinueRef.current = false;
      pendingEmptyToolRetryRef.current = false;
      pendingMalformedToolRetryRef.current = false;
      emptyToolRetryCountRef.current = 0;
      malformedToolRetryCountRef.current = 0;
      malformedToolRetryMessageIdRef.current = null;
      toolCallsThisTurnRef.current = 0;
      debugRewireAgent("sending user message", {
        intent,
        sessionId,
        turnId: turnIdRef.current,
      });

      await sendMessage(
        {
          text: trimmed,
          metadata: {
            intent,
            createdAt: Date.now(),
          },
        },
        {
          body: {
            sessionId,
            intent,
            finalize: false,
          },
        },
      );
    },
    [clearError, sendMessage, sessionId, status],
  );

  const regenerateAgentMessage = useCallback(async () => {
    clearError();
    turnIdRef.current += 1;
    currentIntentRef.current = "custom";
    finalizeRef.current = false;
    pendingAutoContinueRef.current = false;
    pendingEmptyToolRetryRef.current = false;
    pendingMalformedToolRetryRef.current = false;
    emptyToolRetryCountRef.current = 0;
    malformedToolRetryCountRef.current = 0;
    malformedToolRetryMessageIdRef.current = null;
    toolCallsThisTurnRef.current = 0;
    debugRewireAgent("regenerating message", {
      sessionId,
      turnId: turnIdRef.current,
    });

    await regenerate({
      body: {
        sessionId,
        intent: "custom",
        finalize: false,
      },
    });
  }, [clearError, regenerate, sessionId]);

  const stopAgent = useCallback(async () => {
    turnIdRef.current += 1;
    pendingAutoContinueRef.current = false;
    pendingEmptyToolRetryRef.current = false;
    pendingMalformedToolRetryRef.current = false;
    emptyToolRetryCountRef.current = 0;
    malformedToolRetryCountRef.current = 0;
    malformedToolRetryMessageIdRef.current = null;
    finalizeRef.current = false;
    toolCallsThisTurnRef.current = 0;
    currentIntentRef.current = "custom";
    debugRewireAgent("stop requested", {
      sessionId,
      turnId: turnIdRef.current,
      status,
    });

    await stop().catch((error) => {
      console.error("[rewire-agent] stop failed", error);
    });
  }, [sessionId, status, stop]);

  const clearContext = useCallback(async () => {
    await stop();
    clearError();
    turnIdRef.current += 1;
    finalizeRef.current = false;
    pendingAutoContinueRef.current = false;
    pendingEmptyToolRetryRef.current = false;
    pendingMalformedToolRetryRef.current = false;
    emptyToolRetryCountRef.current = 0;
    malformedToolRetryCountRef.current = 0;
    malformedToolRetryMessageIdRef.current = null;
    toolCallsThisTurnRef.current = 0;
    currentIntentRef.current = "custom";
    skipNextSaveRef.current = true;
    setMessages([]);
    await deleteRewireAgentSession(sessionId);
  }, [clearError, sessionId, setMessages, stop]);

  useEffect(() => {
    if (status !== "ready" || !pendingEmptyToolRetryRef.current) {
      return;
    }

    pendingEmptyToolRetryRef.current = false;
    emptyToolRetryCountRef.current += 1;
    debugRewireAgent("retrying empty forced-tool response", {
      intent: currentIntentRef.current,
      retry: emptyToolRetryCountRef.current,
    });

    void sendMessage(undefined, {
      body: {
        sessionId,
        intent: currentIntentRef.current,
        finalize: false,
      },
    });
  }, [sendMessage, sessionId, status]);

  useEffect(() => {
    if (status !== "ready" || !pendingMalformedToolRetryRef.current) {
      return;
    }

    pendingMalformedToolRetryRef.current = false;
    malformedToolRetryCountRef.current += 1;
    debugRewireAgent("retrying malformed XML tool-call response", {
      intent: currentIntentRef.current,
      retry: malformedToolRetryCountRef.current,
    });

    void regenerate({
      messageId: malformedToolRetryMessageIdRef.current ?? undefined,
      body: {
        sessionId,
        intent: currentIntentRef.current,
        finalize: false,
        toolCallFallbackRetry: true,
      },
    });
  }, [regenerate, sessionId, status]);

  useEffect(() => {
    if (status === "error") {
      pendingAutoContinueRef.current = false;
      pendingEmptyToolRetryRef.current = false;
      pendingMalformedToolRetryRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      setIsRestoringSession(true);
      setMessages([]);
    });

    void loadRewireAgentSession(sessionId)
      .then((record) => {
        if (cancelled) {
          return;
        }

        debugRewireAgent("session restored", {
          sessionId,
          messageCount: record?.messages.length ?? 0,
        });
        setMessages(record?.messages ?? []);
      })
      .catch((error) => {
        console.error("[rewire-agent] failed to restore session", errorText(error));
      })
      .finally(() => {
        if (!cancelled) {
          setIsRestoringSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, setMessages]);

  useEffect(() => {
    if (isRestoringSession) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveRewireAgentSession({
        id: sessionId,
        messages,
        updatedAt: Date.now(),
      }).catch((error) => {
        console.error("[rewire-agent] failed to save session", errorText(error));
      });
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [isRestoringSession, messages, sessionId]);

  return {
    clearContext,
    error,
    isRestoringSession,
    messages,
    regenerate: regenerateAgentMessage,
    sendAgentMessage,
    status,
    stop: stopAgent,
    viewContext,
  };
}
