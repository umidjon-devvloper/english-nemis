#!/usr/bin/env node
/**
 * VOA Learning English scraper → JSON catalog.
 *
 * Walks the sitemap, picks article URLs, then extracts MP3 + transcript
 * from each. Writes data/listening/voa-english.json.
 *
 * VOA output is a U.S. Government work → public domain. Safe to
 * redistribute. Attribution recorded for best practice.
 *
 * Usage:
 *   node src/scripts/scrape-voa-listening.js [--limit=30]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const limitFlag = process.argv
  .slice(2)
  .find((a) => a.startsWith("--limit="));
const LIMIT = Number(limitFlag?.split("=")[1]) || 30;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

const SITEMAP_INDEX = "https://learningenglish.voanews.com/sitemap.xml";

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xml,*/*" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);

  // Some endpoints (.xml.gz) return raw gzip without a Content-Encoding
  // header, so Node's fetch doesn't auto-decompress. Detect gzip magic
  // bytes and gunzip ourselves.
  const buf = Buffer.from(await response.arrayBuffer());
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return gunzipSync(buf).toString("utf8");
  }
  return buf.toString("utf8");
}

async function listSitemapChildren(xml) {
  const re = /<loc>([^<]+)<\/loc>/g;
  const urls = [];
  for (const m of xml.matchAll(re)) urls.push(m[1].trim());
  return urls;
}

async function collectArticleUrls(limit) {
  const index = await fetchText(SITEMAP_INDEX);
  const subSitemaps = await listSitemapChildren(index);
  console.log(`Sitemap index → ${subSitemaps.length} sub-sitemaps`);

  const articleUrls = [];
  for (const sm of subSitemaps) {
    try {
      const xml = await fetchText(sm);
      const locs = await listSitemapChildren(xml);
      // Keep article pages WITH a slug — those are lessons/stories.
      // Numeric-only paths (/a/8193616.html) are news without audio.
      for (const loc of locs) {
        if (
          /\/a\/[a-z][a-z0-9-]*\/\d+\.html(?:$|[?#])/i.test(loc) &&
          !/\/multimedia\//.test(loc)
        ) {
          articleUrls.push(loc);
          if (articleUrls.length >= limit * 5) break;
        }
      }
    } catch (e) {
      console.warn(`  × sub-sitemap failed: ${sm} — ${e.message}`);
    }
    if (articleUrls.length >= limit * 5) break;
  }

  // Shuffle lightly so we don't always get the same first articles
  articleUrls.sort(() => Math.random() - 0.5);

  return articleUrls;
}

function extractMp3(html) {
  const re =
    /https?:\/\/(?:voa-audio\.voanews\.eu|av\.voanews\.com)\/[^\s"'<>]+?\.mp3(?:\?[^\s"'<>]*)?/gi;
  const matches = html.match(re) || [];
  return matches[0]?.split("?")[0] || null;
}

function extractTitle(html) {
  const m =
    html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
    html.match(/<title[^>]*>([^<]+?)(?:\s*\|[^<]*)?<\/title>/i);
  return m ? decodeEntities(m[1]).trim() : "";
}

function extractLevelHint(url, title) {
  const t = `${title} ${url}`.toLowerCase();
  if (
    /level 1|level-1|beginning|lesson one|lesson-one|lesson1|lets-learn-english-lesson|basic/i.test(
      t,
    )
  )
    return "A1";
  if (/level 2|level-2|intermediate|lets-learn-english-level-2/i.test(t))
    return "B1";
  if (/level 3|advanced/i.test(t)) return "B2";
  if (/learning-english-/.test(url)) return "A2";
  return "B1";
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    );
}

function extractTranscript(html) {
  // Article body is usually `<div class="wsw">` on VOA.
  const bodyMatch = html.match(
    /<div[^>]*class="[^"]*wsw[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<footer|<aside|<div class="(?:article-tools|related|share|comments))/i,
  );
  const chunk = bodyMatch ? bodyMatch[1] : html;

  let cleaned = chunk
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<figure\b[^<]*(?:(?!<\/figure>)<[^<]*)*<\/figure>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");

  cleaned = decodeEntities(cleaned)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  cleaned = cleaned
    .replace(/^Download the MP3.*$/gim, "")
    .replace(/^.*VOA Learning English.*$/gim, "")
    .replace(/^Words in This Story$[\s\S]*/im, "")
    .replace(/^_+.*$/gim, "")
    // Strip the player widget noise
    .replace(/^Embed$/gim, "")
    .replace(/^share$/gim, "")
    .replace(/^by VOA.*$/gim, "")
    .replace(/^The code has been copied.*$/gim, "")
    .replace(/^The URL has been copied.*$/gim, "")
    .replace(/^No media source.*$/gim, "")
    .replace(/^Direct link.*$/gim, "")
    .replace(/^\d+\s*(kbps|MP3).*$/gim, "")
    .replace(/^Copy$/gim, "")
    // Collapse the resulting whitespace
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}

async function scrapeArticle(url) {
  const html = await fetchText(url);
  const mp3 = extractMp3(html);
  if (!mp3) return null;

  const title = extractTitle(html);
  const transcript = extractTranscript(html);
  // Skip toc-ish pages: real stories/lessons have a substantial transcript.
  if (!title || transcript.length < 1200) return null;
  // Skip the generic Podcast index pages
  if (/^(VOA )?Learning English Podcast$/i.test(title)) return null;

  const level = extractLevelHint(url, title);

  return {
    language: "english",
    level,
    title,
    transcript,
    translationUz: "",
    kind: "lesson",
    durationSec: 0,
    audioUrl: mp3,
    source: {
      name: "VOA Learning English",
      url,
      license: "public domain (U.S. Government work)",
    },
    questions: [],
  };
}

async function main() {
  const candidates = await collectArticleUrls(LIMIT);
  console.log(`\nCandidate article urls: ${candidates.length}`);

  const clips = [];
  const seen = new Set();
  for (const url of candidates) {
    if (clips.length >= LIMIT) break;
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const clip = await scrapeArticle(url);
      if (clip) {
        clips.push(clip);
        console.log(
          `  ✓ [${clip.level}] ${clip.title.slice(0, 70)}  (${clip.transcript.length} chars)`,
        );
      }
    } catch (e) {
      // skip quietly
    }
  }

  if (clips.length === 0) {
    console.log(
      "\nNo clips extracted. Here are the first 5 candidate urls — try one in a browser:",
    );
    console.log(candidates.slice(0, 5).join("\n"));
  }

  const outDir = path.resolve(__dirname, "../../data/listening");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "voa-english.json");
  await fs.writeFile(outPath, JSON.stringify(clips, null, 2));

  console.log(`\n✅ Wrote ${clips.length} clips → ${outPath}`);
  const byLevel = clips.reduce((acc, c) => {
    acc[c.level] = (acc[c.level] || 0) + 1;
    return acc;
  }, {});
  console.log(`Per level: ${JSON.stringify(byLevel)}`);
}

main().catch((e) => {
  console.error("Scrape failed:", e);
  process.exit(1);
});
