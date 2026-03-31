import { logger } from "../logger";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is required");
}

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

interface Message {
  role: "system" | "user" | "assistant";
  content: string | MessageContent[];
}

interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface ChatParams {
  model: string;
  messages: Message[];
  responseFormat?: { type: "json_object" };
  temperature?: number;
  maxTokens?: number;
}

interface ChatResponse {
  content: string;
}

export async function chat(params: ChatParams): Promise<ChatResponse> {
  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
  };

  if (params.maxTokens) {
    body.max_tokens = params.maxTokens;
  }

  if (params.responseFormat) {
    body.response_format = params.responseFormat;
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://duck.app",
      "X-Title": "DUCK Content Beta",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("OpenRouter API error", {
      status: response.status,
      model: params.model,
      error: errorText,
    });
    throw new Error(
      `OpenRouter API returned ${response.status}: ${errorText}`
    );
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned empty content");
  }

  return { content };
}

// ── buildImageMessage ─────────────────────────────────────────
// Helper to build a vision message with an image URL

export function imageMessage(imageUrl: string, text: string): Message {
  return {
    role: "user",
    content: [
      {
        type: "image_url",
        image_url: { url: imageUrl },
      },
      {
        type: "text",
        text,
      },
    ],
  };
}
