import assert from "node:assert/strict";
import test from "node:test";
import {
  cloudinaryImageUrl,
  cloudinaryVideoPlaybackUrl,
  cloudinaryVideoThumbnailUrl,
} from "./media-urls.ts";

const ORIGINAL_VIDEO =
  "https://res.cloudinary.com/demo/video/upload/v123/tamims-world/media/wedding/clip.mp4";
const PLAYBACK_VIDEO =
  "https://res.cloudinary.com/demo/video/upload/f_mp4,q_auto/v123/tamims-world/media/wedding/clip.mp4";

test("video thumbnail is generated from the original resource URL", () => {
  assert.equal(
    cloudinaryVideoThumbnailUrl(ORIGINAL_VIDEO),
    "https://res.cloudinary.com/demo/video/upload/so_1,f_jpg,q_auto,w_800/v123/tamims-world/media/wedding/clip.mp4",
  );
});

test("thumbnail generation never chains f_mp4 into an image transform", () => {
  const thumbnail = cloudinaryVideoThumbnailUrl(PLAYBACK_VIDEO);
  assert.ok(thumbnail.includes("/so_1,f_jpg,q_auto,w_800/v123/"));
  assert.ok(!thumbnail.includes("f_mp4"));
});

test("thumbnail generation is idempotent", () => {
  const once = cloudinaryVideoThumbnailUrl(ORIGINAL_VIDEO);
  assert.equal(cloudinaryVideoThumbnailUrl(once), once);
});

test("video playback and image delivery replace old transformations", () => {
  assert.equal(
    cloudinaryVideoPlaybackUrl(cloudinaryVideoThumbnailUrl(ORIGINAL_VIDEO)),
    "https://res.cloudinary.com/demo/video/upload/f_mp4,q_auto/v123/tamims-world/media/wedding/clip.mp4",
  );
  assert.equal(
    cloudinaryImageUrl("https://res.cloudinary.com/demo/image/upload/w_100/v123/sample.jpg", 640),
    "https://res.cloudinary.com/demo/image/upload/w_640,f_auto,q_auto/v123/sample.jpg",
  );
});

test("non-Cloudinary URLs remain untouched", () => {
  const external = "https://example.com/video.mp4";
  assert.equal(cloudinaryVideoThumbnailUrl(external), external);
  assert.equal(cloudinaryVideoPlaybackUrl(external), external);
});
