import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import AiConfig from "../../models/AiConfig.js";

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const claude = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 0,
    })
  : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 0,
    })
  : null;

async function callChat({
  provider,
  model,
  systemPrompt,
  messages,
  maxOutputTokens = 800,
  timeoutMs = 20000,
}) {
  if (provider === "claude") {
    if (!claude) throw new Error("ANTHROPIC_API_KEY_NOT_CONFIGURED");

    const response = await claude.messages.create(
      {
        model,
        max_tokens: maxOutputTokens,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      },
      { timeout: timeoutMs },
    );

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (!text) throw new Error("EMPTY_AI_RESPONSE");

    return text;
  }

  if (provider === "openai") {
    if (!openai) throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");

    const input = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    const response = await openai.responses.create(
      { model, input, max_output_tokens: maxOutputTokens },
      { timeout: timeoutMs },
    );

    if (!response.output_text) throw new Error("EMPTY_AI_RESPONSE");

    return response.output_text;
  }

  if (provider === "gemini") {
    if (!gemini) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await gemini.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens,
        abortSignal: AbortSignal.timeout(timeoutMs),
      },
    });

    if (!response.text) throw new Error("EMPTY_AI_RESPONSE");

    return response.text;
  }

  throw new Error(`Unsupported chat provider: ${provider}`);
}

export async function chatWithFallback({
  systemPrompt,
  messages,
  maxOutputTokens,
}) {
  const config = await AiConfig.findOne({ key: "global" });

  if (!config) throw new Error("AI_CONFIG_NOT_FOUND");

  const providers = config.providers
    .filter((p) => p.enabled)
    .sort((a, b) => a.priority - b.priority);

  if (providers.length === 0) {
    throw new Error("NO_ENABLED_AI_PROVIDERS");
  }

  const cap = Math.max(
    maxOutputTokens ?? 800,
    config.maxOutputTokens ?? 800,
  );
  const effectiveMax = Math.min(cap, 2500);

  const attempts = [];

  for (const provider of providers) {
    try {
      const text = await callChat({
        provider: provider.name,
        model: provider.model,
        systemPrompt,
        messages,
        maxOutputTokens: effectiveMax,
        timeoutMs: config.timeoutMs ?? 30000,
      });

      return {
        reply: text.trim(),
        provider: provider.name,
        model: provider.model,
        attempts,
      };
    } catch (error) {
      attempts.push({
        provider: provider.name,
        error: error.message || String(error),
      });
    }
  }

  const err = new Error("ALL_PROVIDERS_FAILED");
  err.attempts = attempts;
  throw err;
}

/**
 * Streaming chat — yields incremental text chunks via `onChunk(text)` and
 * returns `{ fullReply, provider, model }` when done. Falls back through
 * providers only on *startup* failures; once a provider has emitted the
 * first chunk, mid-stream errors propagate.
 */
export async function streamChatWithFallback({
  systemPrompt,
  messages,
  onChunk,
}) {
  const config = await AiConfig.findOne({ key: "global" });

  if (!config) throw new Error("AI_CONFIG_NOT_FOUND");

  const providers = config.providers
    .filter((p) => p.enabled)
    .sort((a, b) => a.priority - b.priority);

  if (providers.length === 0) {
    throw new Error("NO_ENABLED_AI_PROVIDERS");
  }

  const maxTokens = Math.min(config.maxOutputTokens ?? 800, 1200);
  const attempts = [];

  for (const provider of providers) {
    try {
      const result = await streamOne({
        provider: provider.name,
        model: provider.model,
        systemPrompt,
        messages,
        maxOutputTokens: maxTokens,
        onChunk,
      });

      return {
        fullReply: result.trim(),
        provider: provider.name,
        model: provider.model,
      };
    } catch (error) {
      attempts.push({
        provider: provider.name,
        error: error.message || String(error),
      });
    }
  }

  const err = new Error("ALL_PROVIDERS_FAILED");
  err.attempts = attempts;
  throw err;
}

async function streamOne({
  provider,
  model,
  systemPrompt,
  messages,
  maxOutputTokens,
  onChunk,
}) {
  if (provider === "claude") {
    if (!claude) throw new Error("ANTHROPIC_API_KEY_NOT_CONFIGURED");

    const stream = claude.messages.stream({
      model,
      max_tokens: maxOutputTokens,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    });

    let full = "";

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) {
        const text = event.delta.text;
        if (text) {
          full += text;
          onChunk(text);
        }
      }
    }

    if (!full) throw new Error("EMPTY_AI_RESPONSE");
    return full;
  }

  if (provider === "openai") {
    if (!openai) throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");

    const stream = await openai.responses.stream({
      model,
      input: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      ],
      max_output_tokens: maxOutputTokens,
    });

    let full = "";

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        const delta = event.delta;
        if (delta) {
          full += delta;
          onChunk(delta);
        }
      }
    }

    if (!full) throw new Error("EMPTY_AI_RESPONSE");
    return full;
  }

  if (provider === "gemini") {
    if (!gemini) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");

    const stream = await gemini.models.generateContentStream({
      model,
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens,
      },
    });

    let full = "";

    for await (const chunk of stream) {
      const text = chunk?.text;
      if (text) {
        full += text;
        onChunk(text);
      }
    }

    if (!full) throw new Error("EMPTY_AI_RESPONSE");
    return full;
  }

  throw new Error(`Unsupported streaming provider: ${provider}`);
}
