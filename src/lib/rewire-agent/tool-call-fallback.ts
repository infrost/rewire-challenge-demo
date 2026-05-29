import type {
  RewireAgentToolInput,
  RewireAgentToolName,
} from "@/lib/rewire-agent/types";

const toolCallTagPattern = "(?:tool_call|tool-call|toolcall)";
const toolCallClosePattern = new RegExp(
  `<\\/${toolCallTagPattern}>\\s*(?:\`\`\`)?\\s*$`,
  "i",
);
const toolCallTailPattern = new RegExp(
  `(<(${toolCallTagPattern})\\b[^>]*>[\\s\\S]*?<\\/\\2>)\\s*(?:\`\`\`)?\\s*$`,
  "i",
);
const directChildTagPattern =
  /<([a-zA-Z_][\w.-]*)\b[^>]*>([\s\S]*?)<\/\1>/g;
const legacyFunctionTagPattern =
  /<function=([\w.-]+)\b[^>]*>([\s\S]*?)<\/function>/i;
const legacyParameterTagPattern =
  /<parameter=([\w.-]+)\b[^>]*>([\s\S]*?)<\/parameter>/gi;

const rewireAgentToolNames = [
  "rewire_explain_view",
  "rewire_summarize_insights",
] as const satisfies readonly RewireAgentToolName[];

export type RewireAgentLeakedToolCallXml = {
  rawXml: string;
  visibleText: string;
};

export type ParsedRewireAgentToolCall = {
  toolName: RewireAgentToolName;
  input: RewireAgentToolInput;
};

function decodeXmlEntities(text: string) {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function normalizeXmlText(text: string) {
  const cdataMatch = text.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);

  return decodeXmlEntities(cdataMatch ? cdataMatch[1] : text).trim();
}

function stripXmlEnvelope(text: string) {
  return text
    .trim()
    .replace(/^```xml\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^\s*<\?xml[\s\S]*?\?>\s*/i, "")
    .trim();
}

function extractXmlElement(xml: string, tagName: string) {
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "i",
  );
  const match = xml.match(pattern);

  return match ? match[1] : null;
}

function extractToolCallBody(xml: string) {
  return (
    extractXmlElement(xml, "tool_call") ??
    extractXmlElement(xml, "tool-call") ??
    extractXmlElement(xml, "toolcall")
  );
}

function parseXmlScalarValue(value: string): string | number | boolean {
  const normalized = normalizeXmlText(value);

  if (!normalized) {
    return "";
  }

  if (/^(true|false)$/i.test(normalized)) {
    return normalized.toLowerCase() === "true";
  }

  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  return normalized;
}

function parseXmlInputObject(inputXml: string | null): Record<string, unknown> {
  if (!inputXml) {
    return {};
  }

  const parsedInput: Record<string, unknown> = {};

  for (const match of inputXml.matchAll(directChildTagPattern)) {
    const key = match[1];
    const rawValue = match[2] ?? "";
    parsedInput[key] = parseXmlScalarValue(rawValue);
  }

  return parsedInput;
}

function isRewireAgentToolName(value: unknown): value is RewireAgentToolName {
  return (
    typeof value === "string" &&
    rewireAgentToolNames.includes(value as RewireAgentToolName)
  );
}

function normalizeToolInput(input: unknown): RewireAgentToolInput {
  if (!input || typeof input !== "object") {
    return {};
  }

  const userFocus = (input as { userFocus?: unknown }).userFocus;

  return typeof userFocus === "string" ? { userFocus } : {};
}

function parseJsonToolCall(body: string): ParsedRewireAgentToolCall | null {
  const normalized = normalizeXmlText(body);

  if (!normalized.startsWith("{")) {
    return null;
  }

  const parsed = JSON.parse(normalized) as {
    name?: unknown;
    toolName?: unknown;
    arguments?: unknown;
    args?: unknown;
    input?: unknown;
  };
  const toolName = parsed.name ?? parsed.toolName;

  if (!isRewireAgentToolName(toolName)) {
    throw new Error("Unsupported REWIRE tool call name.");
  }

  return {
    toolName,
    input: normalizeToolInput(parsed.arguments ?? parsed.args ?? parsed.input),
  };
}

function parseLegacyToolCall(body: string): ParsedRewireAgentToolCall | null {
  const functionMatch = body.match(legacyFunctionTagPattern);

  if (!functionMatch) {
    return null;
  }

  const toolName = normalizeXmlText(functionMatch[1] ?? "");

  if (!isRewireAgentToolName(toolName)) {
    throw new Error("Unsupported REWIRE tool call name.");
  }

  const functionBody = functionMatch[2] ?? "";
  const rawInput: Record<string, unknown> = {};

  for (const match of functionBody.matchAll(legacyParameterTagPattern)) {
    const parameterName = normalizeXmlText(match[1] ?? "");
    const parameterValue = match[2] ?? "";
    rawInput[parameterName] = parseXmlScalarValue(parameterValue);
  }

  return {
    toolName,
    input: normalizeToolInput(rawInput),
  };
}

function parseStructuredToolCall(body: string): ParsedRewireAgentToolCall {
  const name =
    normalizeXmlText(extractXmlElement(body, "name") ?? "") ||
    normalizeXmlText(extractXmlElement(body, "toolName") ?? "");

  if (!isRewireAgentToolName(name)) {
    throw new Error("Unsupported REWIRE tool call name.");
  }

  const inputXml =
    extractXmlElement(body, "input") ??
    extractXmlElement(body, "arguments") ??
    extractXmlElement(body, "args");

  return {
    toolName: name,
    input: normalizeToolInput(parseXmlInputObject(inputXml)),
  };
}

export function extractTrailingRewireToolCallXml(
  text: string,
): RewireAgentLeakedToolCallXml | null {
  if (!toolCallClosePattern.test(text)) {
    return null;
  }

  const match = text.match(toolCallTailPattern);

  if (!match || match.index == null) {
    return null;
  }

  return {
    rawXml: match[1],
    visibleText: text.slice(0, match.index).trimEnd(),
  };
}

export function parseRewireAgentToolCallXml(
  rawXml: string,
): ParsedRewireAgentToolCall {
  const normalized = stripXmlEnvelope(rawXml);
  const body = extractToolCallBody(normalized);

  if (!body) {
    throw new Error("No REWIRE tool call XML body found.");
  }

  return (
    parseJsonToolCall(body) ??
    parseLegacyToolCall(body) ??
    parseStructuredToolCall(body)
  );
}
