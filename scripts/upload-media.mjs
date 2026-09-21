// Uploads the organized media library to Cloudinary and writes a site catalog.
//
// Images come from the raw library; videos come from the compressed copy
// (media-compressed) since the free plan caps video uploads at 100 MB.
//
// Run:
//   node --env-file=.env scripts/upload-media.mjs              # everything
//   node --env-file=.env scripts/upload-media.mjs --kind images
//   node --env-file=.env scripts/upload-media.mjs --kind videos
//   node --env-file=.env scripts/upload-media.mjs --limit 10
// Uploads are idempotent: already-catalogued files are skipped.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync, existsSync, createReadStream } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const RAW = resolve("images and videos");
const COMPRESSED = resolve("media-compressed");
const MANIFEST = join(RAW, "manifest.csv");
const CATALOG = resolve("src/lib/media-catalog.json");

const CAT_SLUG = {
  "00 - زفاف الوالدين": "wedding",
  "01 - يوم الولاده": "birth",
  "02 - السبوع والعقيقه": "seboua",
  "03 - تميم وهو صغير": "little",
  "04 - المناسبات": "occasions",
  "05 - الرحلات": "trips",
  "06 - العمره": "umrah",
  "07 - مع العيله": "family",
  "08 - اللعب والانشطه": "play",
  "09 - الاكل": "food",
  "10 - يوميات وصحه": "health",
};

const args = process.argv.slice(2);
const kindFlag = args.includes("--kind")
  ? args[args.indexOf("--kind") + 1].replace(/s$/, "")
  : "all";
const limitI = args.indexOf("--limit");
const limit = limitI >= 0 ? Number(args[limitI + 1]) : Infinity;

function loadCatalog() {
  try {
    return JSON.parse(readFileSync(CATALOG, "utf8"));
  } catch {
    return { items: [] };
  }
}
const catalog = loadCatalog();
const existing = new Set(catalog.items.map((i) => `${i.kind}|${i.sourceName}|${i.category}`));

function readManifest() {
  const raw = readFileSync(MANIFEST, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  lines.shift();
  const map = new Map();
  for (const line of lines) {
    const cols = line.split(",");
    if (cols.length >= 4)
      map.set(cols[1], { category: cols[0], date: (cols[3] || "").slice(0, 10) });
  }
  return map;
}
const manifest = readManifest();

function slugify(name) {
  const ascii = name
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 28);
  const hash = createHash("sha1").update(name).digest("hex").slice(0, 6);
  return `${ascii || "m"}-${hash}`;
}

function uploadOne(sourcePath, opts) {
  return new Promise((res, rej) => {
    const file = createReadStream(sourcePath);
    const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
      file.destroy();
      err ? rej(err) : res(result);
    });
    file.pipe(stream);
    file.on("error", rej);
  });
}

function saveCatalog() {
  writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + "\n");
}

let done = 0;
let skipped = 0;
let failed = 0;

for (const catName of Object.keys(CAT_SLUG)) {
  const slug = CAT_SLUG[catName];
  const srcDir = join(RAW, catName);
  if (!existsSync(srcDir)) continue;
  const files = readdirSync(srcDir).filter((f) =>
    [".jpg", ".jpeg", ".mp4"].includes(extname(f).toLowerCase()),
  );
  for (const name of files.sort((a, b) => a.localeCompare(b, "ar"))) {
    if (done >= limit) break;
    const isVideo = extname(name).toLowerCase() === ".mp4";
    const fileKind = isVideo ? "video" : "image";
    if (kindFlag !== "all" && kindFlag !== fileKind) continue;

    const sourcePath = isVideo ? join(COMPRESSED, catName, name) : join(srcDir, name);
    if (!existsSync(sourcePath)) {
      console.log(`MISSING source: ${catName}/${name}`);
      failed++;
      continue;
    }
    const key = `${fileKind}|${name}|${catName}`;
    if (existing.has(key)) {
      skipped++;
      continue;
    }

    const meta = manifest.get(name) || { date: "" };
    const publicId = `tamims-world/media/${slug}/${slugify(name)}`;
    try {
      const result = await uploadOne(sourcePath, {
        public_id: publicId,
        overwrite: false,
        resource_type: isVideo ? "video" : "image",
        context: `caption=${JSON.stringify(name).slice(1, -1)}|capture_date=${meta.date}|category=${catName}`,
      });
      catalog.items.push({
        id: `${fileKind === "video" ? "vid" : "img"}-${slug}-${catalog.items.length + 1}`,
        kind: fileKind,
        sourceName: name,
        category: catName,
        date: meta.date,
        url:
          result.secure_url ||
          `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/${fileKind}/upload/${publicId}`,
      });
      saveCatalog();
      done++;
      console.log(`[${done}] uploaded ${fileKind}: ${catName} / ${name}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${fileKind}: ${catName} / ${name} -> ${e.message?.split("\n")[0]}`);
    }
  }
}

console.log(
  `\nuploaded: ${done}, skipped: ${skipped}, failed: ${failed} | catalog has ${catalog.items.length} items`,
);
