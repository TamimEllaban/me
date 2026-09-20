// Uploads the bundled placeholder images to Cloudinary so the site can serve
// them from the CDN. Run: node --env-file=.env scripts/upload-test-images.mjs
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const images = [
  { file: "src/assets/hero-child.jpg", publicId: "tamims-world/hero-child" },
  { file: "src/assets/memory-birth.jpg", publicId: "tamims-world/memory-birth" },
  { file: "src/assets/memory-smile.jpg", publicId: "tamims-world/memory-smile" },
  { file: "src/assets/memory-steps.jpg", publicId: "tamims-world/memory-steps" },
  { file: "src/assets/memory-birthday.jpg", publicId: "tamims-world/memory-birthday" },
];

const out = {};
for (const { file, publicId } of images) {
  const result = await cloudinary.uploader.upload(resolve(file), {
    public_id: publicId,
    overwrite: true,
    tags: ["tamim-test"],
    transformation: [{ width: 1200, crop: "limit", quality: "auto:good" }],
  });
  out[publicId] = result.secure_url;
  console.log(`Uploaded ${publicId} -> ${result.secure_url}`);
}

const dbOnly = { mode: "metadata", urls: out };
console.log("\nIMAGE_MAP=" + JSON.stringify(out, null, 2));
