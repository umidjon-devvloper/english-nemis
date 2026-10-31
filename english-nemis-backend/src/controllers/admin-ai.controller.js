import AiConfig from "../models/AiConfig.js";

export async function getAiConfig(request, reply) {
  const config = await AiConfig.findOneAndUpdate(
    { key: "global" },
    {
      $setOnInsert: {
        key: "global",
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return reply.send({
    success: true,
    config,
    apiKeys: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      claude: Boolean(process.env.ANTHROPIC_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
  });
}

export async function updateAiConfig(request, reply) {
  const allowedFields = [
    "providers",
    "fallbackEnabled",
    "timeoutMs",
    "maxOutputTokens",
    "dailyRequestLimit",
    "autoGenerate",
    "generationTime",
    "timezone",
    "english",
    "german",
    "exerciseTypes",
  ];

  const updates = {};

  for (const field of allowedFields) {
    if (request.body?.[field] !== undefined) {
      updates[field] = request.body[field];
    }
  }

  const config = await AiConfig.findOneAndUpdate(
    { key: "global" },
    { $set: updates },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  return reply.send({
    success: true,
    config,
  });
}