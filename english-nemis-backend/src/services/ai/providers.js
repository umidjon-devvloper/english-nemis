import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    })
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

export async function callProvider({
  provider,
  model,
  prompt,
  maxOutputTokens = 4000,
  timeoutMs = 20000,
}) {
  if (provider === "gemini") {
    if (!gemini) {
      throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");
    }

    const response = await gemini.models.generateContent({
      model,
      contents: prompt,
      config: {
        maxOutputTokens,
        responseMimeType: "application/json",
        abortSignal: AbortSignal.timeout(timeoutMs),
      },
    });

    if (!response.text) {
      throw new Error("EMPTY_AI_RESPONSE");
    }

    return response.text;
  }

  if (provider === "claude") {
    if (!claude) {
      throw new Error("ANTHROPIC_API_KEY_NOT_CONFIGURED");
    }

    const response = await claude.messages.create(
      {
        model,
        max_tokens: maxOutputTokens,
        messages: [
          {
            role: "user",
            content: `${prompt}\n\nReturn only valid JSON.`,
          },
        ],
      },
      {
        timeout: timeoutMs,
      },
    );

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (!text) {
      throw new Error("EMPTY_AI_RESPONSE");
    }

    return text;
  }

  if (provider === "openai") {
    if (!openai) {
      throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");
    }

    const response = await openai.responses.create(
      {
        model,
        input: prompt,
        max_output_tokens: maxOutputTokens,
      },
      {
        timeout: timeoutMs,
      },
    );

    if (!response.output_text) {
      throw new Error("EMPTY_AI_RESPONSE");
    }

    return response.output_text;
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}