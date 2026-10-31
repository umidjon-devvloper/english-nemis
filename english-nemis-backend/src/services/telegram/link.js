import crypto from "node:crypto";

import TelegramLinkToken from "../../models/TelegramLinkToken.js";
import TelegramConnection from "../../models/TelegramConnection.js";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export async function createTelegramLink(userId) {
  const token = crypto.randomBytes(24).toString("base64url");

  await TelegramLinkToken.deleteMany({
    user: userId,
  });

  await TelegramLinkToken.create({
    user: userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  const username = process.env.TELEGRAM_BOT_USERNAME;

  if (!username) {
    throw new Error("TELEGRAM_BOT_USERNAME_NOT_CONFIGURED");
  }

  return {
    url: `https://t.me/${username}?start=${token}`,
    expiresIn: 300,
  };
}

export async function confirmTelegramLink({
  token,
  chatId,
  username,
  firstName,
  lastName,
}) {
  const link = await TelegramLinkToken.findOneAndDelete({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });

  if (!link) {
    throw new Error("INVALID_OR_EXPIRED_LINK");
  }

  const existingChat = await TelegramConnection.findOne({
    chatId: String(chatId),
  });

  if (
    existingChat &&
    existingChat.user.toString() !== link.user.toString()
  ) {
    throw new Error("TELEGRAM_ALREADY_LINKED_TO_ANOTHER_USER");
  }

  await TelegramConnection.findOneAndUpdate(
    { user: link.user },
    {
      $set: {
        chatId: String(chatId),
        username,
        notificationsEnabled: true,
        firstName,
        lastName
      },
    },
    {
      upsert: true,
      returnDocument: "after",
    },
  );

  return { success: true };
}