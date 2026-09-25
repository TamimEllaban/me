import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Database,
  Gauge,
  Layers3,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Video,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getCloudinaryStorageUsageData,
  type CloudinaryStorageUsageResponse,
} from "@/lib/admin.functions";
import type { CloudinaryStorageUsage } from "@/lib/cloudinary-usage.server";

export const Route = createFileRoute("/admin/settings/storage")({
  loader: () => getCloudinaryStorageUsageData({ data: { refresh: false } }),
  head: () => ({
    meta: [{ title: "Cloudinary Storage — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: CloudinaryStoragePage,
});

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[exponent]}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function progressTone(percent: number | null): string {
  if (percent !== null && percent >= 90) return "bg-destructive";
  if (percent !== null && percent >= 75) return "bg-amber-600";
  return "bg-emerald-600";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
      </div>
    </article>
  );
}

function UsageOverview({ data }: { data: CloudinaryStorageUsage }) {
  const isCreditBased = data.usageModel === "credit-based";
  const primary = isCreditBased
    ? {
        label: "استهلاك Credits الخطة",
        usage: data.credits.usage,
        limit: data.credits.limit,
        percent: data.credits.usedPercent,
        unit: "credits",
      }
    : {
        label: "استهلاك Storage",
        usage: data.storage.usageBytes,
        limit: data.storage.limit,
        percent: data.storage.usedPercent,
        unit: "bytes",
      };
  const safePercent = Math.max(0, Math.min(100, primary.percent ?? 0));
  const primaryValue =
    primary.unit === "bytes" ? formatBytes(primary.usage) : formatNumber(primary.usage);
  const limitValue =
    primary.limit === null
      ? "غير متاح في رد Cloudinary"
      : primary.unit === "bytes"
        ? formatBytes(primary.limit)
        : formatNumber(primary.limit);
  const critical = primary.percent !== null && primary.percent >= 80;

  return (
    <>
      {critical && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-600/25 bg-amber-600/10 p-4 text-amber-950 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <p className="font-semibold">اقتربت من حد الخطة أو تجاوزته</p>
            <p className="mt-1 text-sm opacity-85">
              راجع الملفات القديمة والتحويلات (Transformations) والملفات المشتقة قبل ترقية الخطة.
            </p>
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-keepsake">
        <div className="flex flex-col gap-5 border-b border-border/70 bg-secondary/35 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-7">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Cloudinary {data.plan}
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                {isCreditBased ? "Credit-based plan" : data.usageModel}
              </span>
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold">{primary.label}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isCreditBased
                ? "الخطة الحالية لا تُرجع حد Storage منفصل؛ السعة تُحسب من Credits الشهرية."
                : "نسبة Storage الفعلية مقارنة بالحد الذي أرجعه Cloudinary."}
            </p>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="font-display text-4xl font-semibold tabular-nums text-primary">
              {primary.percent === null ? "—" : `${primary.percent.toFixed(1)}%`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">من الحد المتاح</p>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {primaryValue}
                {primary.limit !== null && (
                  <span className="text-muted-foreground"> من {limitValue}</span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {primary.unit === "bytes" ? "المساحة المستخدمة" : "Credits المستخدمة"}
              </p>
            </div>
            {data.credits.remaining !== null && isCreditBased && (
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                متبقي {formatNumber(data.credits.remaining)} credits
              </p>
            )}
          </div>
          <div
            role="progressbar"
            aria-label={primary.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(safePercent)}
            className="mt-5 h-4 overflow-hidden rounded-full bg-secondary"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${progressTone(primary.percent)}`}
              style={{ width: `${safePercent}%` }}
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/70 bg-background p-4">
              <p className="text-xs text-muted-foreground">Storage فعلي</p>
              <p className="mt-1 font-display text-xl font-semibold">
                {formatBytes(data.storage.usageBytes)}
              </p>
              <p className="mt-1 text-[0.68rem] text-muted-foreground">
                {data.storage.creditsUsage === null
                  ? "لا يوجد Credits مقابل متاح"
                  : `${formatNumber(data.storage.creditsUsage)} credits`}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background p-4">
              <p className="text-xs text-muted-foreground">Bandwidth</p>
              <p className="mt-1 font-display text-xl font-semibold">
                {formatBytes(data.bandwidth.usageBytes)}
              </p>
              <p className="mt-1 text-[0.68rem] text-muted-foreground">
                {data.bandwidth.creditsUsage === null
                  ? "لا يوجد حد منفصل"
                  : `${formatNumber(data.bandwidth.creditsUsage)} credits`}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background p-4">
              <p className="text-xs text-muted-foreground">الفترة</p>
              <p className="mt-1 font-display text-xl font-semibold">
                {formatDate(data.lastUpdated)}
              </p>
              <p className="mt-1 text-[0.68rem] text-muted-foreground">Cloudinary last_updated</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Layers3}
          label="Objects"
          value={formatNumber(data.objects.usage)}
          detail={`${formatNumber(data.resources)} resources · ${formatNumber(data.derivedResources)} derived`}
        />
        <MetricCard
          icon={Gauge}
          label="Transformations"
          value={formatNumber(data.transformations.usage)}
          detail={
            data.transformations.creditsUsage === null
              ? "لا يوجد Credits مقابل متاح"
              : `${formatNumber(data.transformations.creditsUsage)} credits`
          }
        />
        <MetricCard
          icon={Video}
          label="Bandwidth credits"
          value={
            data.bandwidth.creditsUsage === null ? "—" : formatNumber(data.bandwidth.creditsUsage)
          }
          detail={`${formatBytes(data.bandwidth.usageBytes)} تم تسليمه`}
        />
        <MetricCard
          icon={Clock3}
          label="API Requests"
          value={formatNumber(data.requests)}
          detail={`الاستجابة مخزنة حتى ${formatDate(data.expiresAt)}`}
        />
      </div>
    </>
  );
}

function CloudinaryStoragePage() {
  const initial = Route.useLoaderData();
  const refreshUsage = useServerFn(getCloudinaryStorageUsageData);
  const [response, setResponse] = useState<CloudinaryStorageUsageResponse>(initial);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      setResponse(await refreshUsage({ data: { refresh: true } }));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Cloudinary Settings
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold">استهلاك المساحة</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            بيانات حقيقية من Admin API، بدون أي أرقام تقديرية، ومحدّثة من السيرفر كل 30 دقيقة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://console.cloudinary.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-semibold transition hover:bg-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
          >
            Cloudinary Dashboard <ArrowUpRight className="size-4" />
          </a>
          <Button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="h-11 px-5"
          >
            {refreshing ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            تحديث الآن
          </Button>
        </div>
      </div>

      {response.ok ? (
        <div aria-live="polite">
          <UsageOverview data={response.data} />
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" />
            {response.data.cacheHit
              ? "تم استخدام النسخة المخزنة مؤقتًا."
              : "تم تنفيذ طلب جديد إلى Cloudinary."}
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-destructive">تعذر تحميل بيانات Cloudinary</h2>
              <p className="mt-1 text-sm leading-6 text-foreground/75">{response.error}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void refresh()}
                className="mt-4"
              >
                <RefreshCw className="size-4" /> إعادة المحاولة
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
