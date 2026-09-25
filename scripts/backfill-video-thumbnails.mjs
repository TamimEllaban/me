// Safe, idempotent backfill for DB-backed gallery videos.
// Run: node --env-file=.env scripts/backfill-video-thumbnails.mjs
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(databaseUrl);

function thumbnailUrlFromVideo(videoUrl) {
  if (!/res\.cloudinary\.com/.test(videoUrl)) return videoUrl;
  const marker = "/video/upload/";
  const markerIndex = videoUrl.indexOf(marker);
  if (markerIndex < 0) return videoUrl;
  const afterMarker = videoUrl.slice(markerIndex + marker.length);
  const versionMatch = afterMarker.match(/v\d+\//);
  const resourcePath =
    versionMatch?.index === undefined ? afterMarker : afterMarker.slice(versionMatch.index);
  return `${videoUrl.slice(0, markerIndex + marker.length)}so_1,f_jpg,q_auto,w_800/${resourcePath}`;
}

await sql`ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`;

const videos = await sql.query(`
  SELECT id, url, thumbnail_url
  FROM gallery_items
  WHERE kind = 'video'
  ORDER BY created_at ASC, id ASC
`);

let fixed = 0;
let alreadyPresent = 0;
const manual = [];

for (const video of videos) {
  if (video.thumbnail_url?.trim()) {
    alreadyPresent += 1;
    continue;
  }

  try {
    const response = await fetch(video.url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
    });
    if (!response.ok && response.status !== 206) {
      manual.push({ id: video.id, status: response.status, reason: "source video unavailable" });
      continue;
    }
    const thumbnailUrl = thumbnailUrlFromVideo(video.url);
    const thumbnailResponse = await fetch(thumbnailUrl, {
      headers: { Range: "bytes=0-0" },
    });
    if (!thumbnailResponse.ok && thumbnailResponse.status !== 206) {
      manual.push({
        id: video.id,
        status: thumbnailResponse.status,
        reason: "thumbnail could not be generated",
      });
      continue;
    }
    const thumbnailType = thumbnailResponse.headers.get("content-type") ?? "";
    if (!thumbnailType.startsWith("image/")) {
      manual.push({
        id: video.id,
        status: thumbnailResponse.status,
        reason: `unexpected thumbnail content type: ${thumbnailType || "unknown"}`,
      });
      continue;
    }
    await sql.query(
      `UPDATE gallery_items SET thumbnail_url = $1 WHERE id = $2 AND kind = 'video'`,
      [thumbnailUrl, video.id],
    );
    fixed += 1;
  } catch (error) {
    manual.push({
      id: video.id,
      status: null,
      reason: error instanceof Error ? error.message : "unknown error",
    });
  }
}

console.log(
  JSON.stringify(
    {
      scanned: videos.length,
      fixed,
      alreadyPresent,
      manualActionRequired: manual.length,
      manual,
    },
    null,
    2,
  ),
);

if (manual.length) process.exitCode = 2;
