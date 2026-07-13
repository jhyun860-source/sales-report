import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

type Provider = "forge" | "gemini" | "openai";

const availableProviders = (): Provider[] => {
  const list: Provider[] = [];
  if (ENV.forgeApiKey) list.push("forge");
  if (ENV.geminiApiKey) list.push("gemini");
  if (ENV.openaiApiKey) list.push("openai");
  return list;
};

const providerUrl = (p: Provider) => {
  if (p === "gemini")
    return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  if (p === "openai") return "https://api.openai.com/v1/chat/completions";
  return ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";
};

const providerModels = (p: Provider): string[] =>
  p === "openai"
    ? ["gpt-4o"]
    : p === "gemini"
      ? ["gemini-2.5-flash", "gemini-3.5-flash"] // 2.5 먼저 시도(무료 한도 더 넉넉), 실패시 3.5로
      : ["gemini-2.5-flash"];

const providerKey = (p: Provider) =>
  p === "gemini" ? ENV.geminiApiKey : p === "openai" ? ENV.openaiApiKey : ENV.forgeApiKey;

const assertApiKey = () => {
  if (availableProviders().length === 0) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const normalizedToolChoice = normalizeToolChoice(toolChoice || tool_choice, tools);
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  const providers = availableProviders();
  const attempts: { provider: Provider; model: string }[] = [];
  for (const provider of providers) {
    for (const model of providerModels(provider)) {
      attempts.push({ provider, model });
    }
  }
  let lastError: unknown = null;

  for (let i = 0; i < attempts.length; i++) {
    const { provider, model } = attempts[i];
    const isLast = i === attempts.length - 1;

    const payload: Record<string, unknown> = {
      model,
      messages: messages.map(normalizeMessage),
    };
    if (tools && tools.length > 0) payload.tools = tools;
    if (normalizedToolChoice) payload.tool_choice = normalizedToolChoice;
    if (normalizedResponseFormat) payload.response_format = normalizedResponseFormat;
    payload.max_tokens = provider === "openai" ? 16384 : 32768;
    // "thinking" 파라미터는 Forge 게이트웨이 전용 확장 필드
    if (provider === "forge") {
      payload.thinking = { budget_tokens: 128 };
    }

    try {
      const response = await fetch(providerUrl(provider), {
        method: "POST",
        signal: AbortSignal.timeout(45000), // 45초 응답 없으면 중단 (무한 로딩 방지)
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${providerKey(provider)}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // 사용량 한도 초과(429)나 모델 사용불가(400) 등은 다음 시도로 자동 전환
        const isRetryable = response.status === 429 || response.status === 400;
        if (isRetryable && !isLast) {
          lastError = new Error(
            `[${provider}/${model}] 실패, 다음으로 전환: ${errorText.slice(0, 200)}`
          );
          continue;
        }
        throw new Error(
          `LLM invoke failed (${provider}/${model}): ${response.status} ${response.statusText} – ${errorText}`
        );
      }

      return (await response.json()) as InvokeResult;
    } catch (e) {
      lastError = e;
      if (isLast) throw e;
      // 네트워크 오류 등도 다음 시도로 폴백
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
