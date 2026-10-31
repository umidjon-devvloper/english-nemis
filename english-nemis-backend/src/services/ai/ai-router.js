import AiConfig from "../../models/AiConfig.js";
import { callProvider } from "./providers.js";

export async function generateWithFallback(prompt) {
  const config = await AiConfig.findOne({
    key: "global",
  });

  if (!config) {
    throw new Error("AI_CONFIG_NOT_FOUND");
  }

  const providers = config.providers
    .filter((provider) => provider.enabled)
    .sort((a, b) => a.priority - b.priority);

  if (providers.length === 0) {
    throw new Error("NO_ENABLED_AI_PROVIDERS");
  }

  const attempts = [];

  for (const provider of providers) {
    try {
      console.log(
        `Trying AI provider: ${provider.name}`,
      );

      const text = await callProvider({
        provider: provider.name,
        model: provider.model,
        prompt,
        maxOutputTokens: config.maxOutputTokens,
        timeoutMs: config.timeoutMs,
      });

      const parsed = JSON.parse(text);

      return {
        data: parsed,
        provider: provider.name,
        model: provider.model,
        attempts,
      };
    } catch (error) {
      const status = error.status ?? error.code ?? null;

      attempts.push({
        provider: provider.name,
        status,
        message: error.message,
      });

      console.error(
        `AI provider ${provider.name} failed:`,
        error.message,
      );

      if (!config.fallbackEnabled) {
        break;
      }
    }
  }

  throw new Error("ALL_AI_PROVIDERS_FAILED");
}