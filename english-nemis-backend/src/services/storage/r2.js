import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 is S3-compatible. We use the AWS SDK with a custom
 * endpoint. Credentials are read from env — nothing works without them.
 *
 * Required env:
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET
 *   R2_PUBLIC_URL    (optional; falls back to R2 public dev URL)
 */
function cfg() {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_PUBLIC_URL,
  } = process.env;

  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    publicUrl: R2_PUBLIC_URL,
    configured: Boolean(
      R2_ACCOUNT_ID &&
        R2_ACCESS_KEY_ID &&
        R2_SECRET_ACCESS_KEY &&
        R2_BUCKET,
    ),
  };
}

let _client = null;
function client() {
  if (_client) return _client;
  const c = cfg();
  if (!c.configured) {
    throw new Error("R2 not configured: set R2_* env vars");
  }
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${c.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey,
    },
  });
  return _client;
}

export function isR2Configured() {
  return cfg().configured;
}

export function publicUrl(key) {
  const c = cfg();
  if (c.publicUrl) {
    return `${c.publicUrl.replace(/\/+$/, "")}/${key}`;
  }
  return `https://${c.bucket}.r2.dev/${key}`;
}

export async function objectExists(key) {
  try {
    await client().send(
      new HeadObjectCommand({ Bucket: cfg().bucket, Key: key }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function uploadBuffer({ key, body, contentType }) {
  await client().send(
    new PutObjectCommand({
      Bucket: cfg().bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return publicUrl(key);
}

export async function fetchAndStoreMp3({ sourceUrl, key }) {
  if (await objectExists(key)) return publicUrl(key);

  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; LinguaCoachBot/1.0; +https://linguacoach.ai)",
      Accept: "audio/mpeg,*/*",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(
      `fetch MP3 failed: ${response.status} ${sourceUrl}`,
    );
  }
  const buf = Buffer.from(await response.arrayBuffer());
  return uploadBuffer({
    key,
    body: buf,
    contentType: "audio/mpeg",
  });
}
