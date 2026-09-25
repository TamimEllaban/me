import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCloudinaryUsage } from "./cloudinary-usage.server.ts";

test("Free plan usage stays credit-based when Cloudinary omits storage limits", () => {
  const usage = normalizeCloudinaryUsage(
    {
      plan: "Free",
      last_updated: "2026-09-24",
      date_requested: "2026-09-25T00:00:00Z",
      storage: { usage: 1_514_667_717, credits_usage: 1.41 },
      bandwidth: { usage: 1_852_720_853, credits_usage: 1.73 },
      objects: { usage: 414 },
      credits: { usage: 11.29, limit: 25, used_percent: 45.16 },
      transformations: { usage: 8_147, credits_usage: 8.15 },
      resources: 246,
      derived_resources: 168,
      requests: 2_885,
    },
    new Date("2026-09-25T10:00:00.000Z"),
  );

  assert.equal(usage.plan, "Free");
  assert.equal(usage.usageModel, "credit-based");
  assert.equal(usage.storage.limit, null);
  assert.equal(usage.bandwidth.limit, null);
  assert.equal(usage.credits.usedPercent, 45.16);
  assert.equal(usage.credits.remaining, 13.71);
  assert.equal(usage.storage.usageBytes, 1_514_667_717);
  assert.equal(usage.cachedAt, "2026-09-25T10:00:00.000Z");
  assert.equal(usage.expiresAt, "2026-09-25T10:30:00.000Z");
});
