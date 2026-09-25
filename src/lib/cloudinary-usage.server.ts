import { fetchCloudinaryUsage, type CloudinaryUsageResponse } from "./cloudinary.server.ts";

const CACHE_TTL_MS = 30 * 60 * 1000;

export type CloudinaryUsageMetric = {
  usage: number;
  limit: number | null;
  usedPercent: number | null;
  creditsUsage: number | null;
};

export type CloudinaryStorageUsage = {
  plan: string;
  usageModel: "credit-based" | "separate-limits" | "hybrid";
  lastUpdated: string | null;
  requestedAt: string | null;
  credits: CloudinaryUsageMetric & { remaining: number | null };
  storage: CloudinaryUsageMetric & { usageBytes: number };
  bandwidth: CloudinaryUsageMetric & { usageBytes: number };
  objects: { usage: number; limit: number | null };
  transformations: { usage: number; creditsUsage: number | null };
  resources: number;
  derivedResources: number;
  requests: number;
  cachedAt: string;
  expiresAt: string;
  cacheHit: boolean;
};

let cachedSnapshot: CloudinaryStorageUsage | null = null;

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function percent(usage: number, limit: number | null, supplied?: number | null): number | null {
  if (supplied !== null && supplied !== undefined) return supplied;
  if (!limit || limit <= 0) return null;
  return Number(((usage / limit) * 100).toFixed(2));
}

export function normalizeCloudinaryUsage(
  raw: CloudinaryUsageResponse,
  cachedAt = new Date(),
): CloudinaryStorageUsage {
  const plan = typeof raw.plan === "string" ? raw.plan : "Unknown";
  const creditUsage = finiteNumber(raw.credits?.usage);
  const creditLimit = optionalNumber(raw.credits?.limit);
  const storageUsage = finiteNumber(raw.storage?.usage);
  const storageLimit = optionalNumber(raw.storage?.limit);
  const bandwidthUsage = finiteNumber(raw.bandwidth?.usage);
  const bandwidthLimit = optionalNumber(raw.bandwidth?.limit);
  const hasSeparateLimits = storageLimit !== null || bandwidthLimit !== null;
  const hasCredits = creditLimit !== null;
  const usageModel =
    hasCredits && !hasSeparateLimits
      ? "credit-based"
      : hasSeparateLimits && hasCredits
        ? "hybrid"
        : "separate-limits";
  const expiresAt = new Date(cachedAt.getTime() + CACHE_TTL_MS);

  return {
    plan,
    usageModel,
    lastUpdated: raw.last_updated ?? null,
    requestedAt: raw.date_requested ?? null,
    credits: {
      usage: creditUsage,
      limit: creditLimit,
      usedPercent: percent(creditUsage, creditLimit, optionalNumber(raw.credits?.used_percent)),
      creditsUsage: creditUsage,
      remaining:
        creditLimit === null ? null : Number(Math.max(0, creditLimit - creditUsage).toFixed(2)),
    },
    storage: {
      usage: storageUsage,
      limit: storageLimit,
      usedPercent: percent(storageUsage, storageLimit),
      creditsUsage: optionalNumber(raw.storage?.credits_usage),
      usageBytes: storageUsage,
    },
    bandwidth: {
      usage: bandwidthUsage,
      limit: bandwidthLimit,
      usedPercent: percent(bandwidthUsage, bandwidthLimit),
      creditsUsage: optionalNumber(raw.bandwidth?.credits_usage),
      usageBytes: bandwidthUsage,
    },
    objects: {
      usage: finiteNumber(raw.objects?.usage),
      limit: optionalNumber(raw.objects?.limit),
    },
    transformations: {
      usage: finiteNumber(raw.transformations?.usage),
      creditsUsage: optionalNumber(raw.transformations?.credits_usage),
    },
    resources: finiteNumber(raw.resources),
    derivedResources: finiteNumber(raw.derived_resources),
    requests: finiteNumber(raw.requests),
    cachedAt: cachedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    cacheHit: false,
  };
}

export async function getCloudinaryStorageUsage(
  forceRefresh = false,
): Promise<CloudinaryStorageUsage> {
  const now = Date.now();
  if (!forceRefresh && cachedSnapshot && now < new Date(cachedSnapshot.expiresAt).getTime()) {
    return { ...cachedSnapshot, cacheHit: true };
  }

  cachedSnapshot = normalizeCloudinaryUsage(await fetchCloudinaryUsage());
  return cachedSnapshot;
}
