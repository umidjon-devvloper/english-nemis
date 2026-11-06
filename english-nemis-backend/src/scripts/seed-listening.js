#!/usr/bin/env node
/**
 * Seed listening clips from data/listening/*.json into MongoDB.
 *
 * If R2 is configured, MP3s are first mirrored to R2 and the public R2
 * URL is stored. Otherwise the source URL is kept so the UI still works
 * and we can migrate later.
 *
 * Usage:
 *   node src/scripts/seed-listening.js [--upload]
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import ListeningClip from "../models/ListeningClip.js";
import { isR2Configured, fetchAndStoreMp3 } from "../services/storage/r2.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadFlag = process.argv.includes("--upload");

function keyForClip(clip) {
  const slug = (clip.title || "clip")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const srcHash = clip.audioUrl.split("/").pop().replace(/\?.*$/, "");
  return `listening/${clip.language}/${slug}-${srcHash}`;
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(mongoUri);
  console.log("✅ MongoDB connected");

  const dir = path.resolve(__dirname, "../../data/listening");
  const files = (await fs.readdir(dir)).filter((f) =>
    f.endsWith(".json"),
  );

  const r2 = isR2Configured();
  console.log(
    `R2: ${r2 ? "configured" : "not configured — storing source URLs"}`,
  );

  let totalInserted = 0;
  let totalUpdated = 0;

  for (const file of files) {
    const contents = JSON.parse(
      await fs.readFile(path.join(dir, file), "utf8"),
    );
    console.log(`\n📥 ${file} — ${contents.length} clips`);

    for (const clip of contents) {
      let audioUrl = clip.audioUrl;

      if (uploadFlag && r2) {
        try {
          const key = keyForClip(clip);
          audioUrl = await fetchAndStoreMp3({
            sourceUrl: clip.audioUrl,
            key,
          });
          console.log(`  ↑ R2  ${key}`);
        } catch (e) {
          console.warn(
            `  × R2 upload failed for ${clip.title}: ${e.message} — keeping source URL`,
          );
        }
      }

      const existing = await ListeningClip.findOne({
        "source.url": clip.source?.url,
      });

      if (existing) {
        existing.audioUrl = audioUrl;
        existing.title = clip.title;
        existing.transcript = clip.transcript;
        existing.translationUz = clip.translationUz || "";
        existing.level = clip.level;
        existing.language = clip.language;
        existing.kind = clip.kind || "lesson";
        existing.source = clip.source;
        existing.questions = clip.questions || existing.questions;
        existing.published = true;
        await existing.save();
        totalUpdated++;
      } else {
        await ListeningClip.create({ ...clip, audioUrl });
        totalInserted++;
      }
    }
  }

  console.log(
    `\n✅ Done — inserted ${totalInserted}, updated ${totalUpdated}`,
  );
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("Seed failed:", e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
