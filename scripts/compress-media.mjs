// Compresses every video in the raw media library so each ends up small
// enough for the Cloudinary free plan (max 100 MB per video upload).
//
// Output goes to media-compressed/<category>/<same name>.mp4 and keeps the
// folder layout + manifest dates for the uploader to reuse.
//
// Run: node scripts/compress-media.mjs
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, existsSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");
if (!ffmpeg) throw new Error("ffmpeg-static missing");

const RAW = resolve("images and videos");
const OUT_ROOT = resolve("media-compressed");

// audio always downmixed stereo
const BASE_AUDIO = ["-c:a", "aac", "-b:a", "96k", "-ac", "2"];

function run(args, ignoreExitCode = false) {
  return new Promise((resolvePromise, rejectPromise) => {
    const p = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", rejectPromise);
    p.on("close", (code) => {
      if (code === 0 || ignoreExitCode) resolvePromise(stderr);
      else rejectPromise(new Error(`ffmpeg exited ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

async function probeDuration(videoPath) {
  const stderr = await run(["-i", videoPath], true);
  const m = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  if (!m) return null;
  return +m[1] * 3600 + +m[2] * 60 + parseFloat(m[3]);
}

async function encode(videoPath, outPath, crf, maxrateK) {
  const args = [
    "-i",
    videoPath,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-vf",
    "scale=1280:1280:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    String(crf),
    "-maxrate",
    `${maxrateK}k`,
    "-bufsize",
    `${maxrateK * 2}k`,
    ...BASE_AUDIO,
    "-movflags",
    "+faststart",
    "-threads",
    "4",
    "-y",
    outPath,
  ];
  await run(args);
  return statSync(outPath).size / (1024 * 1024);
}

const MAX_MB = 95;

async function compressOne(cat, name, srcPath) {
  const outDir = join(OUT_ROOT, cat);
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, name);
  if (existsSync(outPath)) {
    const existing = statSync(outPath).size / (1024 * 1024);
    if (existing > 0 && existing < MAX_MB) {
      return {
        name,
        before: (statSync(srcPath).size / (1024 * 1024)).toFixed(1),
        after: existing.toFixed(1),
        skipped: true,
      };
    }
  }

  const duration = await probeDuration(srcPath);
  if (!duration || duration <= 0) {
    console.log(`SKIP (no duration): ${cat}/${name}`);
    return { name, skipped: true, error: "no-duration" };
  }
  // budget: fit within 95 MB; clamp bitrate for quality on short clips
  const budgetK = Math.floor((MAX_MB * 8 * 1024) / duration);
  const maxrateK = Math.max(600, Math.min(3000, budgetK));
  const crf = maxrateK >= 3000 ? 26 : 28;

  const beforeMB = statSync(srcPath).size / (1024 * 1024);
  let afterMB = await encode(srcPath, outPath, crf, maxrateK);
  if (afterMB >= MAX_MB) afterMB = await encode(srcPath, outPath, 32, Math.floor(maxrateK * 0.6));
  return { name, before: beforeMB.toFixed(1), after: afterMB.toFixed(1), skipped: false };
}

const summary = [];
const cats = readdirSync(RAW, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("."))
  .sort((a, b) => a.name.localeCompare(b.name, "ar"));

// Optional: node scripts/compress-media.mjs "<category>" "<file.mp4>" to compress one file
const onlyCat = process.argv[2];
const onlyFile = process.argv[3];

let totalBefore = 0;
let totalAfter = 0;
let done = 0;
let failed = 0;

for (const catDir of cats) {
  const cat = catDir.name;
  if (onlyCat && cat !== onlyCat) continue;
  const files = readdirSync(join(RAW, cat))
    .filter((f) => f.toLowerCase().endsWith(".mp4"))
    .filter((f) => !onlyFile || f === onlyFile)
    .sort((a, b) => a.localeCompare(b, "ar"));
  for (const name of files) {
    const srcPath = join(RAW, cat, name);
    totalBefore += statSync(srcPath).size;
    try {
      const r = await compressOne(cat, name, srcPath);
      if (r.error) {
        failed++;
        console.log(`FAIL: ${cat}/${name} (${r.error})`);
        continue;
      }
      totalAfter += statSync(join(OUT_ROOT, cat, name)).size;
      summary.push(r);
      done++;
      console.log(
        `[${done}/${files.length}/${cats.length}] ${r.skipped ? "keep" : "done"} ${cat} / ${name}  -> ${r.after} MB (was ${r.before})`,
      );
    } catch (e) {
      failed++;
      console.log(`FAIL: ${cat}/${name} -> ${e.message.split("\n")[0]}`);
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  files: done,
  failed,
  input: (totalBefore / (1024 * 1024)).toFixed(1),
  output: (totalAfter / (1024 * 1024)).toFixed(1),
};
writeFileSync(join(OUT_ROOT, "report.json"), JSON.stringify(report, null, 2));
console.log("\n=== DONE ===");
console.log(
  `compressed ${done} videos (${totalBefore / (1024 * 1024) / 1024} GB -> ${totalAfter / (1024 * 1024) / 1024} GB); failed: ${failed}`,
);
