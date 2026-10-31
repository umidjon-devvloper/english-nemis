import AiUsage from "../../models/AiUsage.js";

export function getUsageDate(timezone = "Asia/Tashkent") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) =>
    parts.find((part) => part.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function recordAiUsage({
  userId = null,
  provider,
  model,
  purpose = "other",
  status,
  inputTokens = 0,
  outputTokens = 0,
  estimatedCostUsd = 0,
  durationMs = 0,
  fallbackUsed = false,
  attemptNumber = 1,
  errorCode = null,
  errorMessage = null,
  requestId,
  timezone = "Asia/Tashkent",
}) {
  return AiUsage.create({
    user: userId,
    provider,
    model,
    purpose,
    status,

    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,

    estimatedCostUsd,
    durationMs,

    fallbackUsed,
    attemptNumber,

    errorCode,
    errorMessage,

    requestId,
    date: getUsageDate(timezone),
  });
}